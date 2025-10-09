"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_errors_1 = __importDefault(require("http-errors"));
const apiKeys_1 = __importDefault(require("./routes/apiKeys"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/security', apiKeys_1.default);
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.use((req, _res, next) => {
    next((0, http_errors_1.default)(404, `Route not found: ${req.method} ${req.originalUrl}`));
});
app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    res.status(status).json({
        error: err.message || 'Internal Server Error',
        status,
    });
});
if (require.main === module) {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    app.listen(port, () => {
        console.log(`API server listening on port ${port}`);
    });
}
exports.default = app;
//# sourceMappingURL=server.js.map