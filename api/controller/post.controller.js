import Post from "../models/post.model.js";
import { errorHandler } from "../utils/error.js";

export const create = async (req, res, next) => {
  if (!req.user.isAdmin) {
    return next(errorHandler(403, "You are not allowed to create a post"));
  }
  if (!req.body.title || !req.body.content) {
    return next(errorHandler(400, "Please provide all required fields"));
  }
  const slug = req.body.title
    .split(" ")
    .join("-")
    .toLowerCase()
    .replace(/[^a-zA-Z0-9-]/g, "");
  // remove anything which isnt numbers and letters
  // In web development, a "slug" is a human-readable, URL-friendly version of a string, typically used to represent a resource or a page on a website.
  const newPost = new Post({
    ...req.body,
    slug, // add slug to the already created body
    userId: req.user.id, // also add the user who created this
  });
  try {
    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (error) {
    next(error);
  }
};

/* very important note : in mongo id is represented by _id but on frontend by userId */

// this (below) is one of the most important function as it is used in dashboard
//   searchbar home page and many other pages

export const getposts = async (req, res, next) => {
  try {
    const startIndex = parseInt(req.query.startIndex) || 0;
    const limit = parseInt(req.query.limit) || 9; // no of items to load at a time -> 9 looks sufficient enough
    const sortDirection = req.query.order === "asc" ? 1 : -1; // sorts in requried
    const posts = await Post.find({
      // these are all the external queries
      ...(req.query.userId && { userId: req.query.userId }),
      ...(req.query.category && { category: req.query.category }),
      ...(req.query.slug && { slug: req.query.slug }),
      ...(req.query.postId && { _id: req.query.postId }),
      ...(req.query.searchTerm && {
        $or: [
          // this is internal query searches inside the content and title
          { title: { $regex: req.query.searchTerm, $options: "i" } },
          { content: { $regex: req.query.searchTerm, $options: "i" } },
        ],
      }),
    })
      .sort({ updatedAt: sortDirection })
      .skip(startIndex)
      .limit(limit);

    const totalPosts = await Post.countDocuments();

    const now = new Date();

    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );

    const lastMonthPosts = await Post.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });

    res.status(200).json({
      posts, /// here we sent the posts the same is what we receive when fetch in updateposts \\\
      totalPosts,
      lastMonthPosts,
    });
  } catch (error) {
    next(error);
  }
};

// this can be deleted by either admin or the creator of this post
export const deletepost = async (req, res, next) => {
  if (!req.user.isAdmin || req.user.id !== req.params.userId) {
    // req.user.id: This likely represents the ID of the authenticated user who is making the request. It is often set after the user has logged in or has been authenticated in some way.

    // req.params.userId: This is likely a parameter extracted from the URL of the request. It represents the ID of the user to whom the operation (in this case, deleting a post) is being applied.

    return next(errorHandler(403, "You are not allowed to delete this post"));
  }
  try {
    await Post.findByIdAndDelete(req.params.postId);
    res.status(200).json("The post has been deleted");
  } catch (error) {
    next(error);
  }
};

export const updatepost = async (req, res, next) => {
  if (!req.user.isAdmin || req.user.id !== req.params.userId) {
    return next(errorHandler(403, "You are not allowed to update this post"));
  }
  try {
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.postId,
      {
        $set: {
          title: req.body.title,
          content: req.body.content,
          category: req.body.category,
          image: req.body.image,
        },
      },
      { new: true }
    );
    res.status(200).json(updatedPost);
  } catch (error) {
    next(error);
  }
};

// Passing the Error: When next(error) is called, Express will skip any remaining middleware functions in the current middleware stack and move to the next middleware function specifically designed to handle errors.

// Handling the Error Response: If you haven't explicitly defined an error handling middleware, Express will use its default error handling mechanism. It typically sends an error response to the client with an appropriate status code and error message.
