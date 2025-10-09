"use strict";
// Core types shared across all packages
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = void 0;
// Event types
var EventType;
(function (EventType) {
    EventType["MESSAGE_RECEIVED"] = "message.received";
    EventType["MESSAGE_SENT"] = "message.sent";
    EventType["CONVERSATION_CREATED"] = "conversation.created";
    EventType["CONVERSATION_UPDATED"] = "conversation.updated";
    EventType["HUMAN_HANDOFF_REQUESTED"] = "human_handoff.requested";
    EventType["DOCUMENT_UPLOADED"] = "document.uploaded";
    EventType["DOCUMENT_INDEXED"] = "document.indexed";
})(EventType || (exports.EventType = EventType = {}));
//# sourceMappingURL=types.js.map