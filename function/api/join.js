export async function onRequestPost(context) {
  try {
    const incomingData = await context.request.formData();

    const formspreeData = new FormData();

    // Formspree subject
    formspreeData.append(
      "_subject",
      "New EMBEDX Club Application"
    );

    // Existing EMBEDX fields
    formspreeData.append(
      "full_name",
      incomingData.get("full_name") || ""
    );

    formspreeData.append(
      "department",
      incomingData.get("department") || ""
    );

    formspreeData.append(
      "year",
      incomingData.get("year") || ""
    );

    formspreeData.append(
      "email",
      incomingData.get("email") || ""
    );

    formspreeData.append(
      "phone",
      incomingData.get("phone") || ""
    );

    formspreeData.append(
      "technical_skills",
      incomingData.get("technical_skills") || ""
    );

    formspreeData.append(
      "motivation",
      incomingData.get("motivation") || ""
    );

    formspreeData.append(
      "portfolio",
      incomingData.get("portfolio") || ""
    );

    formspreeData.append(
      "consent",
      incomingData.get("consent") || ""
    );

    // Preserve ALL selected technical interests
    const interests = incomingData.getAll("interests");

    interests.forEach((interest) => {
      formspreeData.append("interests", interest);
    });

    // Send from Cloudflare's server to Formspree
    const formspreeResponse = await fetch(
      "https://formspree.io/f/xbglaeyv",
      {
        method: "POST",
        body: formspreeData,
        headers: {
          Accept: "application/json"
        }
      }
    );

    const responseText = await formspreeResponse.text();

    // Return Formspree result to your frontend
    return new Response(responseText, {
      status: formspreeResponse.status,
      headers: {
        "Content-Type":
          formspreeResponse.headers.get("Content-Type") ||
          "application/json"
      }
    });

  } catch (error) {

    console.error("EMBEDX submission error:", error);

    return new Response(
      JSON.stringify({
        error: "Unable to process the application."
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