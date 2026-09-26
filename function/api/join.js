export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    const payload = {
      type: "join",
      name: body.full_name || "",
      email: body.email || "",
      phone: body.phone || "",
      department: body.department || "",
      year: body.year || "",
      interests: Array.isArray(body.interests) ? body.interests : [],
      technical_skills: body.technical_skills || "",
      motivation: body.motivation || "",
      portfolio: body.portfolio || ""
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
        message: "Join request submitted successfully"
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