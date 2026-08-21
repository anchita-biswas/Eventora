const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Event = require("../models/Event");

function makeToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
}

async function makeUser(email, overrides = {}) {
  const user = await User.create({
    name: "U",
    email,
    password: "x",
    role: "user",
    isVerified: true,
    ...overrides,
  });
  return { user, token: makeToken(user) };
}

async function makeAdmin(email) {
  return makeUser(email, { name: "Admin", role: "admin" }).then(({ user, token }) => ({
    admin: user,
    token,
  }));
}

async function makeEvent(overrides = {}) {
  return Event.create({
    title: "E",
    description: "d",
    date: new Date(),
    location: "l",
    category: "c",
    totalSeats: 5,
    availableSeats: 5,
    ticketPrice: 0,
    image: "http://x.com/y.png",
    createdBy: new mongoose.Types.ObjectId(),
    ...overrides,
  });
}

module.exports = { makeUser, makeAdmin, makeEvent };
