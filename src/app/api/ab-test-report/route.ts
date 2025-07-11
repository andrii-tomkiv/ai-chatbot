import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { report, configAName, configBName } = await request.json();
    
    if (!report || !configAName || !configBName) {
      return NextResponse.json(
        { error: 'Missing required fields: report, configAName, configBName' },
        { status: 400 }
      );
    }

    const cleanConfigAName = configAName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
    const cleanConfigBName = configBName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ab-test-${cleanConfigAName}-vs-${cleanConfigBName}-${timestamp}.json`;
    
    const resultsDir = path.join(process.cwd(), 'data', 'evaluation', 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    let reportJson;
    try {
      reportJson = JSON.stringify(report, null, 2);
      console.log('Report serialization successful, size:', reportJson.length);
    } catch (serializationError) {
      console.error('Report serialization failed:', serializationError);
      return NextResponse.json(
        { error: 'Failed to serialize report data' },
        { status: 500 }
      );
    }
    
    const reportPath = path.join(resultsDir, filename);
    fs.writeFileSync(reportPath, reportJson);
    
    return NextResponse.json({
      success: true,
      filename,
      path: reportPath
    });
  } catch (error) {
    console.error('Failed to save A/B test report:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to save report' },
      { status: 500 }
    );
  }
} 