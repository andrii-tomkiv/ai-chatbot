import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'mysql://chatbot_user:chatbot_password@localhost:3306/chatbot_db'
    }
  }
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get('ip');

    if (!ip) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'IP parameter is required' 
        },
        { status: 400 } as any
      );
    }

    const requests = await prisma.userRequests.findMany({
      where: {
        userIP: ip
      },
      orderBy: {
        date: 'desc'
      },
      select: {
        id: true,
        userIP: true,
        message: true,
        response: true,
        date: true
      }
    } as any);

    return NextResponse.json({
      success: true,
      requests: requests
    });
  } catch (error) {
    console.error('Failed to fetch user requests:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch user requests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 } as any
    );
  }
} 