export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    const payload = {
      type: "inquiry",
      name: body.name || "",
      email: body.email || "",
      subject: body.subject || "",
      message: body.message || ""
    };

    const response = await fetch(env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.text();

    if (!response.ok) {
      throw new Error(result || "Apps Script request failed");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Enquiry submitted successfully"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Submission failed"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}