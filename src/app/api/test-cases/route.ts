import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const testCasesPath = path.join(process.cwd(), 'data', 'evaluation', 'evaluation-test-cases.json');
    const testCasesData = fs.readFileSync(testCasesPath, 'utf-8');
    const data = JSON.parse(testCasesData);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to load test cases:', error);
    return NextResponse.json(
      { error: 'Failed to load test cases' },
      { status: 500 }
    );
  }
} 