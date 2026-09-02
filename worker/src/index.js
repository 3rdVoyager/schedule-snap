import { parseBearerAuth, requireBearerType } from "./auth.js";
import { createEvent } from "./create.js";
import { corsHeaders, json } from "./lib.js";
import { getManageEvent, updateManageEvent, deleteManageEvent, updateResponseCritical } from "./manage.js";
import {
  getEventByCode,
  getResponseForEdit,
  submitResponse,
  updateResponse,
  deleteResponse,
} from "./respond.js";
import { getOrganizerView, getParticipantView } from "./view.js";

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (err) {
      console.error(err);
      return json({ error: "Internal server error" }, 500);
    }
  },
};

async function handleRequest(request, env) {
  const segments = new URL(request.url).pathname.split("/");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // POST /api/events/create
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      segments[3] === "create" &&
      !segments[4] &&
      request.method === "POST"
    ) {
      return createEvent(request, env);
    }

    // GET /api/events/respond
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      segments[3] === "respond" &&
      !segments[4] &&
      request.method === "GET"
    ) {
      const auth = parseBearerAuth(request);
      if (auth.error) return auth.error;
      if (auth.type === "event") return getEventByCode(env, auth.value);
      if (auth.type === "edit") return getResponseForEdit(env, auth.value);
      return json({ error: "Authorization required" }, 401);
    }

    // POST /api/events/respond
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      segments[3] === "respond" &&
      !segments[4] &&
      request.method === "POST"
    ) {
      const auth = requireBearerType(request, "event");
      if (auth.error) return auth.error;
      return submitResponse(request, env, auth.value);
    }

    // PATCH /api/events/respond
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      segments[3] === "respond" &&
      !segments[4] &&
      request.method === "PATCH"
    ) {
      const auth = requireBearerType(request, "edit");
      if (auth.error) return auth.error;
      return updateResponse(request, env, auth.value);
    }

    // DELETE /api/events/respond
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      segments[3] === "respond" &&
      !segments[4] &&
      request.method === "DELETE"
    ) {
      const auth = requireBearerType(request, "edit");
      if (auth.error) return auth.error;
      return deleteResponse(env, auth.value);
    }

    // GET /api/events/view
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      segments[3] === "view" &&
      !segments[4] &&
      request.method === "GET"
    ) {
      const auth = parseBearerAuth(request);
      if (auth.error) return auth.error;
      if (auth.type === "event") return getParticipantView(env, auth.value);
      if (auth.type === "manage") return getOrganizerView(env, auth.value);
      return json({ error: "Authorization required" }, 401);
    }

    // PATCH /api/events/manage/responses/:responseId
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      segments[3] === "manage" &&
      segments[4] === "responses" &&
      segments[5] &&
      !segments[6] &&
      request.method === "PATCH"
    ) {
      const auth = requireBearerType(request, "manage");
      if (auth.error) return auth.error;
      return updateResponseCritical(request, env, auth.value, segments[5]);
    }

    // GET /api/events/manage
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      segments[3] === "manage" &&
      !segments[4] &&
      request.method === "GET"
    ) {
      const auth = requireBearerType(request, "manage");
      if (auth.error) return auth.error;
      return getManageEvent(env, auth.value);
    }

    // PATCH /api/events/manage
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      segments[3] === "manage" &&
      !segments[4] &&
      request.method === "PATCH"
    ) {
      const auth = requireBearerType(request, "manage");
      if (auth.error) return auth.error;
      return updateManageEvent(request, env, auth.value);
    }

    // DELETE /api/events/manage
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      segments[3] === "manage" &&
      !segments[4] &&
      request.method === "DELETE"
    ) {
      const auth = requireBearerType(request, "manage");
      if (auth.error) return auth.error;
      return deleteManageEvent(env, auth.value);
    }

    return json({ message: "Not found" }, 404);
}
