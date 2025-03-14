import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import v1Routes from './routes/v1/server.js';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Swagger stuff
const swaggerDocs = YAML.load(path.join(process.cwd(), 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use('/v1', v1Routes);

const PORT = process.env.PORT || 5558;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
