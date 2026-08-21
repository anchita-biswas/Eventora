const Event = require("../models/Event");

// Escape regex metacharacters so user search input is matched literally
// instead of being interpreted as a pattern (blocks ReDoS + query injection).
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.getAllEvents = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.category) {
      filters.category = req.query.category;
    }
    if (req.query.location) {
      filters.location = req.query.location;
    }
    if (req.query.search) {
      const re = new RegExp(escapeRegex(req.query.search), "i");
      filters.$or = [{ title: re }, { description: re }, { location: re }];
    }
    if (req.query.minPrice || req.query.maxPrice) {
      filters.ticketPrice = {};
      if (req.query.minPrice) filters.ticketPrice.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filters.ticketPrice.$lte = Number(req.query.maxPrice);
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 0, 0);
    let query = Event.find(filters);
    if (limit > 0) {
      query = query.skip((page - 1) * limit).limit(limit);
    }

    const events = await query;
    res.json(events);
  } catch (error) {
    next(error);
  }
};

exports.getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(event);
  } catch (error) {
    next(error);
  }
};

exports.createEvent = async (req, res, next) => {
  const {
    title,
    description,
    date,
    location,
    category,
    totalSeats,
    ticketPrice,
    image,
  } = req.body;
  try {
    const event = await Event.create({
      title,
      description,
      date,
      location,
      category,
      totalSeats,
      availableSeats: totalSeats,
      ticketPrice,
      image,
      createdBy: req.user._id,
    });
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
};

exports.updateEvent = async (req, res, next) => {
  const {
    title,
    description,
    date,
    location,
    category,
    totalSeats,
    ticketPrice,
    image,
  } = req.body;
  try {
    const current = await Event.findById(req.params.id);
    if (!current) {
      return res.status(404).json({ error: "Event not found" });
    }

    const update = {
      title,
      description,
      date,
      location,
      category,
      totalSeats,
      ticketPrice,
      image,
    };

    /*
     * Changing capacity has to move availableSeats with it, otherwise raising
     * totalSeats leaves a sold-out event sold out forever and lowering it can
     * leave more seats on sale than exist. Seats already taken are the fixed
     * quantity here, so the remainder is what's left of the new total — never
     * negative when capacity is cut below what's already booked.
     */
    if (totalSeats !== undefined && Number(totalSeats) !== current.totalSeats) {
      const booked = current.totalSeats - current.availableSeats;
      update.availableSeats = Math.max(0, Number(totalSeats) - booked);
    }

    const event = await Event.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    res.json(event);
  } catch (error) {
    next(error);
  }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    next(error);
  }
};
