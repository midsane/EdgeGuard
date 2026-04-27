import { processEvents } from './src/consumers/eventConsumer.js';

processEvents().catch(console.error);