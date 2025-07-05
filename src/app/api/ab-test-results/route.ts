import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const resultsDir = path.join(process.cwd(), 'data', 'evaluation', 'results');
    
    // Ensure the results directory exists
    if (!fs.existsSync(resultsDir)) {
      return NextResponse.json({ results: [] });
    }
    
    // Get all JSON files from the results directory
    const files = fs.readdirSync(resultsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(resultsDir, file);
        const stats = fs.statSync(filePath);
        
        // Extract metadata from filename
        const isABTest = file.startsWith('ab-test-');
        let configAName = '';
        let configBName = '';
        let timestamp = '';
        
        if (isABTest) {
          // Format: ab-test-{configA}-vs-{configB}-{timestamp}.json
          const match = file.match(/ab-test-(.+)-vs-(.+)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.json$/);
          if (match) {
            configAName = match[1];
            configBName = match[2];
            timestamp = match[3];
          }
        }
        
        return {
          filename: file,
          isABTest,
          configAName,
          configBName,
          timestamp: timestamp || stats.mtime.toISOString(),
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    
    return NextResponse.json({ results: files });
  } catch (error) {
    console.error('Failed to list A/B test results:', error);
    return NextResponse.json(
      { error: 'Failed to list results' },
      { status: 500 }
    );
  }
} 