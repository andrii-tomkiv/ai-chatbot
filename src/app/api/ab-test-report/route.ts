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

    // Create filename with configuration names and timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ab-test-${configAName}-vs-${configBName}-${timestamp}.json`;
    
    // Ensure the results directory exists
    const resultsDir = path.join(process.cwd(), 'data', 'evaluation', 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Save the report
    const reportPath = path.join(resultsDir, filename);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`A/B test report saved to: ${reportPath}`);
    
    return NextResponse.json({
      success: true,
      filename,
      path: reportPath
    });
  } catch (error) {
    console.error('Failed to save A/B test report:', error);
    return NextResponse.json(
      { error: 'Failed to save report' },
      { status: 500 }
    );
  }
} 