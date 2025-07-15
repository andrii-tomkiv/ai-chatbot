import { NextRequest, NextResponse } from "next/server";
import { serviceFactory } from '@/shared/utils/helpers/service-factory';

export async function GET(request: NextRequest) {
  try {
    const hybridDB = serviceFactory.getHybridVectorDB();
    const isEnabled = hybridDB.isSemanticSearchEnabled();
    
    return NextResponse.json({
      semanticSearchEnabled: isEnabled,
      message: `Semantic search is ${isEnabled ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    console.error('Error getting semantic search status:', error);
    return NextResponse.json(
      { error: "Failed to get semantic search status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: "enabled field must be a boolean" },
        { status: 400 }
      );
    }

    const hybridDB = serviceFactory.getHybridVectorDB();
    hybridDB.setSemanticSearch(enabled);

    return NextResponse.json({
      semanticSearchEnabled: enabled,
      message: `Semantic search ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Error setting semantic search status:', error);
    return NextResponse.json(
      { error: "Failed to set semantic search status" },
      { status: 500 }
    );
  }
} 