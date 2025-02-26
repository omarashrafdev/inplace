const { ForbiddenError } = require("../core/errors");
const { decodeAuthorizationToken } = require("./utils");
const { RevokedToken } = require("../authentication/models");

const attachUserInfoToReq = () => {
	return async (req, res, next) => {
		const authToken = req.headers["x-auth-token"];
		if (authToken) {
			try {
				const revoked = await RevokedToken.findOne({ where: { token: authToken } });
				if (revoked) {
					throw new ForbiddenError("Token has been revoked. Please log in again.");
				}

				const decoded = decodeAuthorizationToken(authToken);
				req.userId = decoded.userId;
			} catch (err) {
				console.error(err);
				return res.status(401).json({ message: "Invalid or expired token" });
			}
		}
		next();
	};
};

const jwtFilter = () => {
	return (req, res, next) => {
		if (!req.userId) {
			throw new ForbiddenError("No authorization token provided");
		}
		next();
	};
};

module.exports = { attachUserInfoToReq, jwtFilter };
