import jwt from 'jsonwebtoken';
import { prisma } from "../utils/prisma/prismaClient.js";
import { ValidateToken } from "../utils/token/tokenCreate.js";
import dotenv from "dotenv";

dotenv.config();

export default async function (req, res, next) {
    const { authorization } = req.headers;   

    if (authorization === undefined) {
        return res.status(404).json({ message: 'not authorization found' });
    }        

    const [tokenType, accessToken] = authorization.split(' ');
    if (tokenType !== process.env.TOKEN_TYPE_CHECK) {
        return res.status(401).json({ message: '토큰 타입이 일치하지 않습니다.' });
    }

    // 토큰 검증
    const decodedToken = ValidateToken(accessToken, process.env.ACCESS_TOKEN_SECRET_KEY);
    if (!decodedToken) {
        return res.status(401).json({ message: '토큰이 만료되었습니다.' })
    }

    // id가 User table에 있는지 확인
    const id = decodedToken.id;
    const user = await prisma.users.findFirst({
        where: {
            id : id
        }
    });

    if (!user) {
        return res.status(401).json({message:`${id} 사용자를 찾을수 없습니다.`})
    }

    req.user = user;

    next();    
}