import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationGateway.name);
  private readonly connectedClients: Map<string, string> = new Map(); // socketId -> userId

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      this.connectedClients.set(client.id, payload.sub);
      this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);
      
      // Join a room specific to the user for targeted notifications
      client.join(`user_${payload.sub}`);
    } catch (error) {
      this.logger.error(`Connection unauthorized: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Send a notification to a specific user
   */
  sendToUser(userId: string, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }

  /**
   * Send a system-wide broadcast
   */
  broadcast(message: any) {
    this.server.emit('broadcast', message);
  }
}
