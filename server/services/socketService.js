import { Server } from 'socket.io';

let io = null;

export const attachSocket = (httpServer) => {
  if (io) return io;
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  io.on('connection', (socket) => {
    console.log('🔌 Socket.IO client connected:', socket.id);
    socket.on('supplier-message-refresh', () => {
      io.emit('supplier-message-refresh');
    });
    socket.on('disconnect', () => {
      console.log('🔌 Socket.IO client disconnected:', socket.id);
    });
  });
  return io;
};

export const emitSupplierMessage = (message) => {
  if (io) {
    io.emit('supplier-message', message);
    io.emit('supplier-message-refresh');
  }
};

export const getIO = () => io;
