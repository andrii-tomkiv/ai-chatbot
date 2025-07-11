import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'mysql://chatbot_user:chatbot_password@localhost:3306/chatbot_db'
    }
  }
});

export async function GET() {
  try {
    const uniqueIPs = await prisma.userRequests.groupBy({
      by: ['userIP'],
      _count: {
        userIP: true
      },
      orderBy: {
        _count: {
          userIP: 'desc'
        }
      }
    } as any);

    const ips = uniqueIPs.map(item => item.userIP);

    return NextResponse.json({
      success: true,
      ips: ips
    });
  } catch (error) {
    console.error('Failed to fetch unique IPs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch unique IPs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 } as any
    );
  }
} 