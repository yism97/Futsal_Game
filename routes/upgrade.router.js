import express from 'express';
import { prisma } from '../utils/prisma/prismaClient.js';
import { executeTransaction } from '../utils/transaction/executeTransaction.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

router.patch(
  '/Upgrade/:inventoryId',
  authMiddleware,
  async (req, res, next) => {
    const { inventoryId } = req.params;
    const userId = req.user.userId;
    const inventory = await prisma.inventory.findFirst({
      where: {
        inventoryId: +inventoryId,
      },
    });
    if (!inventory) {
      return res.status(404).json({
        errormessage: '존재하지 않는 인벤토리id입니다.',
      });
    }
    if (inventory.userId !== userId) {
      return res.status(400).json({
        errormessage: '접근한 인벤토리 id와 토큰id가 일치하지 않습니다.',
      });
    }
    if (inventory.upgrade === parseInt(process.env.MAX_CARD_VALUE)) {
      return res
        .status(200)
        .json({ message: '이미 최대로 강화된 선수입니다.' });
    }
    const upgrade = await prisma.upgradeDB.findFirst({
      where: {
        upgrade: inventory.upgrade,
      },
    });

    //upgrade.probability = 1, 0.8, 0.6, 0.5, 0.25, 0.15, 0.07, 0.04, 0.02, 0.01
    if (Math.random() > upgrade.probability / 100) {
      if (Math.random() >= 0.5) {
        return res.status(200).json({ message: '선수 강화에 실패하였습니다' });
      }
      const fail = async (tx) => {
        const update = await tx.inventory.update({
          data: {
            upgrade: inventory.upgrade - 1,
          },
          where: {
            inventoryId: inventory.inventoryId,
          },
        });
      };
      executeTransaction(fail);
      return res.status(200).json({
        message: `선수 강화에 실패해 강화 수치가 ${
          inventory.upgrade - 1
        }이 되었습니다`,
      });
    }

    const success = async (tx) => {
      const update = await tx.inventory.update({
        data: {
          upgrade: inventory.upgrade + 1,
        },
        where: {
          inventoryId: inventory.inventoryId,
        },
      });
    };
    executeTransaction(success);
    return res.status(200).json({
      message: `선수 강화에 성공해 강화 수치가 ${
        inventory.upgrade + 1
      }이 되었습니다`,
    });
  }
);

// router.post('/Upgrade/Data-Push', async (req, res, next) => {
//   const data = req.body;
//   const upgrade = async (tx) => {
//     const create = await tx.upgradeDB.create({
//       data: {
//         ...data,
//       },
//     });
//   };
//   executeTransaction(upgrade);
//   return res.status(200).json({ data });
// });

export default router;
