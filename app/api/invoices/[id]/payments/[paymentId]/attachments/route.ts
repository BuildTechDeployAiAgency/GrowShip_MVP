import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Get attachments for a payment line
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; paymentId: string }> }
) {
  const { id, paymentId } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify payment line exists and user has access
    const { data: paymentLine, error: paymentError } = await supabase
      .from("invoice_payment_lines")
      .select(`
        id,
        invoices!inner(id, brand_id, distributor_id)
      `)
      .eq("id", paymentId)
      .eq("invoice_id", id)
      .single();

    if (paymentError || !paymentLine) {
      return NextResponse.json({ error: "Payment line not found" }, { status: 404 });
    }

    // Fetch attachments
    const { data: attachments, error } = await supabase
      .from("payment_attachments")
      .select("*")
      .eq("payment_line_id", paymentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching payment attachments:", error);
      return NextResponse.json(
        { error: "Failed to fetch attachments" },
        { status: 500 }
      );
    }

    return NextResponse.json(attachments || []);
  } catch (error: any) {
    console.error("Unexpected error fetching attachments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Upload attachment for a payment line
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; paymentId: string }> }
) {
  const { id, paymentId } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify payment line exists and user has permission to upload
    const { data: paymentLine, error: paymentError } = await supabase
      .from("invoice_payment_lines")
      .select(`
        id,
        created_by,
        invoices!inner(id, brand_id, distributor_id)
      `)
      .eq("id", paymentId)
      .eq("invoice_id", id)
      .single();

    if (paymentError || !paymentLine) {
      return NextResponse.json({ error: "Payment line not found" }, { status: 404 });
    }

    // Check if user can upload to this payment line
    if (paymentLine.created_by !== user.id) {
      return NextResponse.json(
        { error: "You can only upload attachments to your own payment lines" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg", 
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only images, PDFs, and Word documents are allowed" },
        { status: 400 }
      );
    }

    // Generate unique file path
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `payment-proof-${paymentId}-${timestamp}.${fileExtension}`;
    const filePath = `payment-attachments/${fileName}`;

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("payment-attachments")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Save attachment record to database
    const attachmentData = {
      payment_line_id: paymentId,
      file_name: file.name,
      file_path: uploadData.path,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: user.id,
    };

    const { data: newAttachment, error: dbError } = await supabase
      .from("payment_attachments")
      .insert(attachmentData)
      .select()
      .single();

    if (dbError) {
      console.error("Error saving attachment record:", dbError);
      
      // Try to clean up the uploaded file
      await supabase.storage
        .from("payment-attachments")
        .remove([uploadData.path]);
        
      return NextResponse.json(
        { error: "Failed to save attachment record" },
        { status: 500 }
      );
    }

    return NextResponse.json(newAttachment);
  } catch (error: any) {
    console.error("Unexpected error uploading attachment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}