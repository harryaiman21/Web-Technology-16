import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  
  // This takes the data from the UiPath robot and inserts it into PostgreSQL
  const { data, error } = await supabase
    .from('incidents')
    .insert([
      { 
        tracking_id: body.tracking_id, 
        customer_name: body.customer_name, 
        issue_summary: body.issue_summary,
        priority: body.priority,
        status: 'Pending'
      }
    ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: "Success" }, { status: 201 });
}