import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Get signed URL for attachment download
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; paymentId: string; attachmentId: string }> }
) {
  const { id, paymentId, attachmentId } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify attachment exists and user has access
    const { data: attachment, error: attachmentError } = await supabase
      .from("payment_attachments")
      .select(`
        *,
        invoice_payment_lines!inner(
          id,
          invoice_id,
          invoices!inner(id, brand_id, distributor_id)
        )
      `)
      .eq("id", attachmentId)
      .eq("payment_line_id", paymentId)
      .single();

    if (attachmentError || !attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Verify invoice ID matches the URL parameter
    if (attachment.invoice_payment_lines.invoice_id !== id) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Get user profile for permission check
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role_name, brand_id, distributor_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Check permissions
    const invoice = attachment.invoice_payment_lines.invoices;
    const isSuperAdmin = profile.role_name === "super_admin";
    const isBrandAdmin = profile.role_name === "brand_admin" && invoice.brand_id === profile.brand_id;
    const isDistributor = invoice.distributor_id === profile.distributor_id;

    if (!isSuperAdmin && !isBrandAdmin && !isDistributor) {
      return NextResponse.json(
        { error: "You do not have permission to access this attachment" },
        { status: 403 }
      );
    }

    // Generate signed URL for file download
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("payment-attachments")
      .createSignedUrl(attachment.file_path, 300); // 5 minutes expiry

    if (signedUrlError) {
      console.error("Error generating signed URL:", signedUrlError);
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      downloadUrl: signedUrlData.signedUrl,
      fileName: attachment.file_name,
      fileType: attachment.file_type,
      fileSize: attachment.file_size,
    });
  } catch (error: any) {
    console.error("Unexpected error getting attachment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete attachment
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; paymentId: string; attachmentId: string }> }
) {
  const { id, paymentId, attachmentId } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify attachment exists and get file path
    const { data: attachment, error: attachmentError } = await supabase
      .from("payment_attachments")
      .select(`
        *,
        invoice_payment_lines!inner(
          id,
          invoice_id,
          invoices!inner(id, brand_id, distributor_id)
        )
      `)
      .eq("id", attachmentId)
      .eq("payment_line_id", paymentId)
      .single();

    if (attachmentError || !attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Verify invoice ID matches
    if (attachment.invoice_payment_lines.invoice_id !== id) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Users can only delete their own attachments
    if (attachment.uploaded_by !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own attachments" },
        { status: 403 }
      );
    }

    // Delete file from storage first
    const { error: storageError } = await supabase.storage
      .from("payment-attachments")
      .remove([attachment.file_path]);

    if (storageError) {
      console.error("Error deleting file from storage:", storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete attachment record from database
    const { error: dbError } = await supabase
      .from("payment_attachments")
      .delete()
      .eq("id", attachmentId);

    if (dbError) {
      console.error("Error deleting attachment record:", dbError);
      return NextResponse.json(
        { error: "Failed to delete attachment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Unexpected error deleting attachment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}