import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { report, configAName, configBName } = await request.json();
    
    console.log('Received report save request:', {
      configAName,
      configBName,
      evaluationStrategy: report?.evaluationStrategy,
      resultsCount: report?.results?.length
    });
    
    if (!report || !configAName || !configBName) {
      return NextResponse.json(
        { error: 'Missing required fields: report, configAName, configBName' },
        { status: 400 }
      );
    }

    // Clean config names for filename (remove special characters)
    const cleanConfigAName = configAName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
    const cleanConfigBName = configBName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
    
    // Create filename with configuration names and timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ab-test-${cleanConfigAName}-vs-${cleanConfigBName}-${timestamp}.json`;
    
    console.log('Generated filename:', filename);
    
    // Ensure the results directory exists
    const resultsDir = path.join(process.cwd(), 'data', 'evaluation', 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Try to serialize the report to check for issues
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
    
    // Save the report
    const reportPath = path.join(resultsDir, filename);
    fs.writeFileSync(reportPath, reportJson);
    
    console.log(`A/B test report saved to: ${reportPath}`);
    
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