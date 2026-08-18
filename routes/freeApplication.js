import express from 'express';
import { submitFreeApplication } from '../controllers/freeApplicationController.js';

const router = express.Router();

// POST /api/free-application
router.post('/', submitFreeApplication);

export default router;
