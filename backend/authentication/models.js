const sequelize = require("../core/db");
const { DataTypes } = require("sequelize");

const VerificationToken = sequelize.define("token", {
	content: {
		type: DataTypes.STRING,
		allowNull: false
	}
});

const RevokedToken = sequelize.define("RevokedToken", {
    token: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    revokedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = { VerificationToken, RevokedToken };
