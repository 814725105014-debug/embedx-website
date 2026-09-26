export async function onRequestPost({ request, env }) {
  try {
    if (!env.APPS_SCRIPT_URL) {
      throw new Error("APPS_SCRIPT_URL is not configured");
    }

    const contentType = request.headers.get("content-type") || "";
    let data = {};

    if (contentType.includes("application/json")) {
      data = await request.json();
    } else {
      const formData = await request.formData();

      for (const [key, value] of formData.entries()) {
        data[key] = String(value);
      }
    }

    const payload = {
      type: "inquiry",
      name: data.name || "",
      email: data.email || "",
      subject: data.subject || "",
      message: data.message || ""
    };

    const response = await fetch(env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.text();

    return new Response(result, {
      status: response.status,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message
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
