import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test 1: Check connection by querying competition_config
    const { data: config, error: configError } = await supabase
      .from('competition_config')
      .select('*')
      .limit(1);

    if (configError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to connect to Supabase',
          details: configError.message
        },
        { status: 500 }
      );
    }

    // Test 2: Check if tables exist
    const { data: athletes, error: athletesError } = await supabase
      .from('athletes')
      .select('count');

    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('count');

    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful!',
      data: {
        competition_config: config,
        tables_accessible: {
          athletes: !athletesError,
          activities: !activitiesError,
          competition_config: !configError,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error',
        details: error.message
      },
      { status: 500 }
    );
  }
}
