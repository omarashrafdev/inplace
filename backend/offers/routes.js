const privateOffersRouter = require("express").Router();
const publicOffersRouter = require("express").Router();
const joi = require("joi");

const { defineRoute } = require("../core/define_route");
const { NotFoundError, InternalServerError, ForbiddenError } = require("../core/errors");
const { Offer, OFFER_TYPE_ENUM } = require("./models");
const { Like } = require("../likes/models");
const { upload } = require("./../core/middlewares");
const { preprocessBuffer, uploadBuffer } = require("../core/images");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

const FEATURE = "offers";

defineRoute({
	router: publicOffersRouter,
	feature: FEATURE,
	path: "/all",
	method: "get",
	description: "List all offers with pagination",
	handler: async (req, res) => {
		const limit = parseInt(req.query.limit) || 10;
		const page = parseInt(req.query.page) || 1;
		const offset = (page - 1) * limit;
		
		const { rows: offers, count: totalOffers } = await Offer.findAndCountAll({
			limit,
			offset
		});

		const enrichedOffers = await Promise.all(
			offers.map(async (offer) => {
				const likes = await Like.findAll({
					where: { offerId: offer.id }
				});
				return {
					...offer.toJSON(),
					likes: likes.length,
					is_liked: likes.map((like) => like.userId).includes(req.userId)
				};
			})
		);

		res.json({
			totalOffers,
			currentPage: page,
			totalPages: Math.ceil(totalOffers / limit),
			offers: enrichedOffers
		});
	}
});

defineRoute({
	router: publicOffersRouter,
	feature: FEATURE,
	path: "/offer/:id",
	method: "get",
	description: "get an offer by id",
	handler: async (req, res) => {
		const offer = await Offer.findByPk(req.params.id, { include: "user" });
		if (!offer) throw new NotFoundError("Offer Not Found!");
		const likes = await Like.findAll({
			where: {
				offerId: offer.id
			}
		});
		res.json({
			...offer.toJSON(),
			likes: likes.length,
			is_liked: likes.map((like) => like.userId).includes(req.userId)
		});
	}
});

defineRoute({
	router: publicOffersRouter,
	feature: FEATURE,
	path: "/search/",
	method: "get",
	description: "Search for offers with pagination",
	handler: async (req, res) => {
		const { query } = req.query;
		console.log(query);
		const limit = parseInt(req.query.limit) || 10;
		const page = parseInt(req.query.page) || 1;
		const offset = (page - 1) * limit;

		const { rows: offers, count: totalOffers } = await Offer.findAndCountAll({
			where: {
				[Op.or]: [
					{ title: { [Op.iLike]: `%${query}%` } },
					{ description: { [Op.iLike]: `%${query}%` } },
					{ appliances: { [Op.iLike]: `%${query}%` } }
				]
			},
			limit,
			offset
		});

		const enrichedOffers = await Promise.all(
			offers.map(async (offer) => {
				const likes = await Like.findAll({
					where: { offerId: offer.id }
				});
				return {
					...offer.toJSON(),
					likes: likes.length,
					is_liked: likes.map((like) => like.userId).includes(req.userId)
				};
			})
		);

		res.json({
			totalOffers,
			currentPage: page,
			totalPages: Math.ceil(totalOffers / limit),
			offers: enrichedOffers
		});
	}
});


const addOfferSchema = joi.object({
	title: joi.string().required().max(50),
	description: joi.string().allow(""),
	longitude: joi.number().min(-180).max(180).required(),
	latitude: joi.number().min(-90).max(90).required(),
	area: joi.number().required(),
	offerType: joi
		.string()
		.valid(...OFFER_TYPE_ENUM)
		.required(),
	offerPrice: joi.number().required(),
	isFurnished: joi.boolean(),
	floorNumber: joi.number().integer(),
	roomCount: joi.number().integer(),
	bathroomCount: joi.number().integer(),
	bedCount: joi.number().integer(),
	images: joi.array().items(joi.string()).default([]),
	appliances: joi.string().allow(""),
	notes: joi.string()
});
defineRoute({
	router: privateOffersRouter,
	feature: FEATURE,
	path: "/create",
	method: "post",
	description: "create a new offer",
	inputSchema: addOfferSchema,
	middlewares: [upload.array("images")],
	handler: async (req, res) => {
		let imageUrls = [];
		if (req.files && req.files.length > 0) {
			const imageUploadTasks = req.files.map(async (file) => {
				file.originalname = Date.now() + "__" + file.originalname;
				const preProcessedBuffer = await preprocessBuffer(file.buffer);
				const result = await uploadBuffer(preProcessedBuffer);
				return result.secure_url;
			});

			imageUrls = await Promise.all(imageUploadTasks);
		}

		const offer = await Offer.create({
			userId: req.userId,
			images: imageUrls,
			...req.body
		});

		res.json(offer);
	}
});


const updateOfferSchema = joi.object({
	title: joi.string().max(50),
	description: joi.string().allow(""),
	longitude: joi.number().min(-180).max(180),
	latitude: joi.number().min(-90).max(90),
	area: joi.number(),
	offerType: joi.string().valid(...OFFER_TYPE_ENUM),
	offerPrice: joi.number(),
	isFurnished: joi.boolean(),
	floorNumber: joi.number().integer(),
	roomCount: joi.number().integer(),
	bathroomCount: joi.number().integer(),
	bedCount: joi.number().integer(),
	images: joi.array().items(joi.string()),
	appliances: joi.string().allow(""),
	notes: joi.string()
});
defineRoute({
	router: privateOffersRouter,
	feature: FEATURE,
	path: "/update/:id",
	method: "patch",
	description: "Update an existing offer",
	inputSchema: updateOfferSchema,
	middlewares: [upload.array("images")],
	handler: async (req, res) => {
		const { id } = req.params;
		const offer = await Offer.findByPk(id);

		if (!offer) throw new NotFoundError("Offer not found!");
		if (offer.userId !== req.userId)
			throw new ForbiddenError("You can only update your own offers!");

		let imageUrls = offer.images || [];

		if (req.files && req.files.length > 0) {
			const imageUploadTasks = req.files.map(async (file) => {
				file.originalname = Date.now() + "__" + file.originalname;
				const preProcessedBuffer = await preprocessBuffer(file.buffer);
				const result = await uploadBuffer(preProcessedBuffer);
				return result.secure_url;
			});
			imageUrls = await Promise.all(imageUploadTasks);
		}

		await offer.update({
			...req.body,
			images: imageUrls
		});

		res.json(offer);
	}
});


defineRoute({
	router: privateOffersRouter,
	feature: FEATURE,
	path: "/remove/:id",
	method: "delete",
	description: "delete an offer",
	handler: async (req, res) => {
		const offer = await Offer.findByPk(req.params.id);
		if (!offer) throw new NotFoundError("Offer not found!");
		try {
			offer.destroy();
			res.json(offer);
		} catch (error) {
			throw new InternalServerError(
				"Something went wrong while deleting the offer, please try again later."
			);
		}
	}
});

module.exports = { privateOffersRouter, publicOffersRouter };
