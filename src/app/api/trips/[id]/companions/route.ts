import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ FIXED: Create Supabase client inside a function, not at module level
const getSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(url, key)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient() // ✅ Create client here
    const { id } = await params
    
    const { data, error } = await supabase
      .from('trip_companions')
      .select('*')
      .eq('trip_id', id)
      .order('created_at')

    if (error) throw error

    return NextResponse.json({
      success: true,
      companions: data || []
    })

  } catch (error) {
    console.error('Companions fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch companions' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient() // ✅ Create client here
    const { id } = await params
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('trip_companions')
      .insert({
        trip_id: id,
        ...body
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      companion: data
    })

  } catch (error) {
    console.error('Companion creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add companion' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient() // ✅ Create client here
    const { id } = await params
    const body = await request.json()
    const { companionId, ...updateData } = body
    
    const { data, error } = await supabase
      .from('trip_companions')
      .update(updateData)
      .eq('id', companionId)
      .eq('trip_id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      companion: data
    })

  } catch (error) {
    console.error('Companion update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update companion' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient() // ✅ Create client here
    const { id } = await params
    const url = new URL(request.url)
    const companionId = url.searchParams.get('companionId')
    
    if (!companionId) {
      return NextResponse.json(
        { success: false, error: 'Companion ID is required' },
        { status: 400 }
      )
    }
    
    const { error } = await supabase
      .from('trip_companions')
      .delete()
      .eq('id', companionId)
      .eq('trip_id', id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Companion deleted successfully'
    })

  } catch (error) {
    console.error('Companion deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete companion' },
      { status: 500 }
    )
  }
}