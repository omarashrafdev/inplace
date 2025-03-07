const { Op } = require("sequelize");
const { Like } = require("./models");
const { User } = require("../users/models");
const { Offer } = require("../offers/models");

const { defineRoute } = require("../core/define_route");
const { NotFoundError, ValidationError } = require("../core/errors");

const likesRouter = require("express").Router();

const FEATURE = "likes";

defineRoute({
	router: likesRouter,
	feature: FEATURE,
	path: "/like/:offerId",
	method: "post",
	description: "Like an offer",
	handler: async (req, res) => {
		const offerId = req.params.offerId;
		const offer = await Offer.findByPk(offerId);
		if (!offer) throw new NotFoundError("Offer Not Found");
		let like = await Like.findOne({
			where: {
				[Op.and]: {
					userId: req.userId,
					offerId: offerId
				}
			}
		});

		if (like) {
			throw new ValidationError("You already liked this offer");
		}

		like = await Like.create({
			userId: req.userId,
			offerId: offerId
		});
		res.json(like);
	}
});


defineRoute({
	router: likesRouter,
	feature: FEATURE,
	path: "/dislike/:offerId",
	method: "delete",
	description: "Dislike a offer",
	handler: async (req, res) => {
		const offerId = req.params.offerId;
		const offer = await Offer.findByPk(offerId);
		if (!offer) throw new NotFoundError("Offer Not Found");
		let like = await Like.findOne({
			where: {
				[Op.and]: {
					userId: req.userId,
					offerId: offerId
				}
			}
		});
		if (!like)
			throw new ValidationError("You didn't like this offer anyway");
		like.destroy();
		res.json(like);
	}
});


defineRoute({
	router: likesRouter,
	feature: FEATURE,
	path: "/status/:offerId",
	method: "get",
	description: "Check if the logged-in user liked an offer",
	handler: async (req, res) => {
		const offerId = req.params.offerId;
		const like = await Like.findOne({
			where: {
				userId: req.userId,
				offerId: offerId
			}
		});

		res.json({ liked: !!like });
	}
});


defineRoute({
	router: likesRouter,
	feature: FEATURE,
	path: "/list",
	method: "get",
	description: "List all offers liked by this user",
	handler: async (req, res) => {
		const userId = req.userId;
		const offerIDs = (await Like.findAll({ where: { userId } })).map(
			(like) => like.offerId
		);
		const offers = await Offer.findAll({
			where: { id: { [Op.in]: offerIDs } }
		});
		res.json(offers);
	}
});

defineRoute({
	router: likesRouter,
	feature: FEATURE,
	path: "/list/:offerId",
	method: "get",
	description: "List all users that liked an offer and return the like count",
	handler: async (req, res) => {
		const offerId = req.params.offerId;
		const offer = await Offer.findByPk(offerId);
		if (!offer) throw new NotFoundError("Offer Not Found");

		const likes = await Like.findAll({ where: { offerId: offerId } });
		const userIDs = likes.map((like) => like.userId);

		const users = await User.findAll({
			where: { id: { [Op.in]: userIDs } }
		});

		res.json({
			count: likes.length,
			users
		});
	}
});

module.exports = { likesRouter };
