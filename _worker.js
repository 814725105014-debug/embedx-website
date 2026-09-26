import { onRequestPost as joinHandler } from "./function/api/join.js";
import { onRequestPost as inquiryHandler } from "./function/api/inquiry.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/join") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      return joinHandler({
        request,
        env,
        waitUntil: ctx.waitUntil
      });
    }

    if (url.pathname === "/api/inquiry") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      return inquiryHandler({
        request,
        env,
        waitUntil: ctx.waitUntil
      });
    }

    return env.ASSETS.fetch(request);
  }
};