import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import { Role } from "../../../../generated/prisma/enums.js";
import config from "../../config/index.js";
import { AppError } from "../../utils/AppError.js";
import { jwtUtils } from "../../utils/jwt.js";
import type { ILoginPayload, IRegisterStudentPayload, IverifyEmailPayload } from "./auth.interface.js";
import { Prisma } from "../../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js"; //capital prisma is the generated client, lowercase prisma is the instance of the client
import { connectRedis, redisClient } from "../../lib/redis.js";
import ejs from "ejs";
import path from "path";
import { transporter } from "../../lib/nodemailer.js";
import crypto from "node:crypto";


/** Placeholder generator — swap for a real roll-number scheme. */
const generateStudentId = () => `STU-${Date.now().toString(36).toUpperCase()}`;
const OTP_EXPIRATION_SECOND =5*60; 
const otpKeyFor=(email: string)=>`studen-registration-otp:${email}`;
const pendingDataKeyFor =(email:string)=>`student-registration-data${email}`;



const issueTokens = (jwtPayload: JwtPayload) => {
  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions
  );

  return { accessToken, refreshToken };
};

/*
registration. Does NOT create a User row — it hashes the
password, stashes the whole payload in Redis under the email (5 minute
TTL), generates a 6-digit OTP (also 5 minute TTL), and emails it.
The actual account is created in verifyStudentEmail below
*/

const registerStudent = async (payload: IRegisterStudentPayload) => {
  const email = payload.email.trim().toLowerCase();

  const isUserExist = await prisma.user.findUnique({ where: { email } });

  if (isUserExist) {
    throw new AppError(httpStatus.CONFLICT, "An account with this email already exists");
  }

  // departmentName is validated against the Department enum (CSE/EEE/CIVIL)
  // by the Zod schema before this runs — no DB lookup needed, it's a fixed enum.
  //example:
  //const department = await prisma.department.findUnique({
  //  where: { name: payload.departmentName },
  //});
  //if (!department) {
  //  throw new AppError(httpStatus.NOT_FOUND, "Department not found");
  //}



  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(config.bcrypt_salt_rounds) || 10
  );

  const otp = crypto.randomInt(100000, 1000000).toString();

  await connectRedis();

  await redisClient.set(otpKeyFor(email), otp, {
    expiration: { type: "EX", value: OTP_EXPIRATION_SECOND },
  });

  const pendingPayload = {
    ...payload,
    email,
    password: hashedPassword, // never store the plaintext password, even temporarily
  };

  await redisClient.set(
    pendingDataKeyFor(email),
    JSON.stringify(pendingPayload),
    { expiration: { type: "EX", value: OTP_EXPIRATION_SECOND } }
  );
  const templatePath = path.join(
    process.cwd(),
    "src/app/templates/registration-otp.ejs"
  );

  const html = await ejs.renderFile(templatePath, {
    name: payload.name,
    email: payload.email,
    otp,
    expirationMinutes: OTP_EXPIRATION_SECOND / 60,

  });

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: "Verify your email — University Management System",
    html,
  });
};



const verifyStudentEmail=async(payload:IverifyEmailPayload)=>{
  const email=payload.email.trim().toLowerCase();
  const isUserExist=await prisma.user.findUnique({where:{email}});

  if (isUserExist){

    throw new AppError(httpStatus.CONFLICT,"This email is already verified and registerd");
  }

  await connectRedis();

  const redisOtp =await redisClient.get(otpKeyFor(email));
  if(!redisOtp){
    throw new AppError(httpStatus.BAD_REQUEST,"otp has expired ,please register again");
  }
  if(redisOtp !==payload.otp){
    throw new AppError(httpStatus.BAD_REQUEST,"Ivalid OTP");
  }
  const redisPendingData = await redisClient.get(pendingDataKeyFor(email));
  if (!redisPendingData) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Registration data has expired. Please register again."
    );
  }
  const pendingPayload:IRegisterStudentPayload  & {password:string}=JSON.parse(redisPendingData);

  const user=await prisma.$transaction(async(tx:Prisma.TransactionClient)=>{
    const createdUser = await tx.user.create({
      data: {
        email,
        name: pendingPayload.name,
        password: pendingPayload.password, // already hashed at registration time
        role: Role.STUDENT,
        emailVerified: true,
      },
    });

    const createdStudentProfile = await tx.studentProfile.create({
      data: {
        userId: createdUser.id,
        studentId: pendingPayload.studentId ?? generateStudentId(),
        department: pendingPayload.departmentName,
        phone: pendingPayload.phone,
        address: pendingPayload.address,
        dateOfBirth: pendingPayload.dateOfBirth
          ? new Date(pendingPayload.dateOfBirth)
          : undefined,
      },
    });

    await tx.transcript.create({
      data: { studentId: createdStudentProfile.id },
    });

    return createdUser;
  });
  await redisClient.del(otpKeyFor(email));
  await redisClient.del(pendingDataKeyFor(email));

  const templatePath = path.join(process.cwd(), "src/app/templates/welcome-email.ejs");
  const html = await ejs.renderFile(templatePath, { name: user.name });

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: "Welcome to the University Management System",
    html,
  });

  const jwtPayload = { userId: user.id,email: user.email, name: user.name, role: user.role };
  const { accessToken, refreshToken } = issueTokens(jwtPayload);

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    accessToken,
    refreshToken,
  };

}






const loginUser = async (payload: ILoginPayload) => {
  const email = payload.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.deletedAt) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new AppError(httpStatus.FORBIDDEN, "This account has been deactivated");
  }

  const isPasswordMatched = await bcrypt.compare(payload.password, user.password);

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  const jwtPayload = { userId: user.id,email: user.email, name: user.name, role: user.role };
  const { accessToken, refreshToken } = issueTokens(jwtPayload);

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    accessToken,
    refreshToken,
  };
};





const getMe = async (requestUser: { userId: string }) => {
  const user = await prisma.user.findUnique({
    where: { id: requestUser.userId },
    include: { studentProfile: true, facultyProfile: true },
    omit: { password: true },
  });

  if (!user || user.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};




const refreshToken = async (token: string) => {
  const verified = jwtUtils.verifyToken(token, config.jwt_refresh_secret);

  if (!verified.success || !verified.data) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      config.node_env === "development" ? verified.error : "Invalid refresh token"
    );
  }

  const data = verified.data as JwtPayload;

  const user = await prisma.user.findUnique({ where: { id: data.userId } });

  if (!user || user.deletedAt || !user.isActive) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User is inactive or not found");
  }

  // Rotate both tokens on every refresh.
  return issueTokens({ userId: user.id,email: user.email, name: user.name, role: user.role });
};




export const AuthService = {
  registerStudent,
  verifyStudentEmail,
  loginUser,
  getMe,
  refreshToken,
};
