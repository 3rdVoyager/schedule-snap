import { requireBearer } from "./auth.js";
import { createEvent } from "./create.js";
import { corsHeaders, json } from "./lib.js";
import { getManageEvent, updateManageEvent } from "./manage.js";
import {
  getEventByCode,
  getResponseForEdit,
  submitResponse,
  updateResponse,
} from "./respond.js";
import { getOrganizerView, getParticipantView } from "./view.js";

export default {
  async fetch(request, env) {
    const segments = new URL(request.url).pathname.split("/");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // POST /api/events
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      !segments[3] &&
      request.method === "POST"
    ) {
      return createEvent(request, env);
    }

    // GET /api/events/manage
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      segments[3] === "manage" &&
      !segments[4] &&
      request.method === "GET"
    ) {
      const auth = requireBearer(request);
      if (auth.error) return auth.error;
      return getManageEvent(env, auth.token);
    }

    // PUT /api/events/manage
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      segments[3] === "manage" &&
      !segments[4] &&
      request.method === "PUT"
    ) {
      const auth = requireBearer(request);
      if (auth.error) return auth.error;
      return updateManageEvent(request, env, auth.token);
    }

    // GET /api/events/view
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      segments[3] === "view" &&
      !segments[4] &&
      request.method === "GET"
    ) {
      const auth = requireBearer(request);
      if (auth.error) return auth.error;
      return getOrganizerView(env, auth.token);
    }

    // GET /api/events/:eventCode/view
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      segments[3] &&
      segments[4] === "view" &&
      !segments[5] &&
      request.method === "GET"
    ) {
      return getParticipantView(env, segments[3]);
    }

    // GET /api/events/:eventCode
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      segments[3] &&
      !segments[4] &&
      request.method === "GET"
    ) {
      return getEventByCode(env, segments[3]);
    }

    // GET /api/responses/edit
    if (
      segments[1] === "api" &&
      segments[2] === "responses" &&
      segments[3] === "edit" &&
      !segments[4] &&
      request.method === "GET"
    ) {
      const auth = requireBearer(request);
      if (auth.error) return auth.error;
      return getResponseForEdit(env, auth.token);
    }

    // PUT /api/responses/edit
    if (
      segments[1] === "api" &&
      segments[2] === "responses" &&
      segments[3] === "edit" &&
      !segments[4] &&
      request.method === "PUT"
    ) {
      const auth = requireBearer(request);
      if (auth.error) return auth.error;
      return updateResponse(request, env, auth.token);
    }

    // POST /api/events/:eventCode/responses
    if (
      segments[1] === "api" &&
      segments[2] === "events" &&
      segments[3] &&
      segments[4] === "responses" &&
      request.method === "POST"
    ) {
      return submitResponse(request, env, segments[3]);
    }

    return json({ message: "Not found" }, 404);
  },
};
