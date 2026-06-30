import jwt from "jsonwebtoken";

export const authUser = (req, res, next) => {
  try {
    const token = req.headers.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.id;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired, please log in again",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

export const authDoctor = (req, res, next) => {
  try {
    const dtoken = req.headers.dtoken;

    if (!dtoken) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const decoded = jwt.verify(dtoken, process.env.JWT_SECRET);

    req.docId = decoded.id;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired, please log in again",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

export const authAdmin = (req, res, next) => {
  try {
    const atoken = req.headers.atoken;

    if (!atoken) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const decoded = jwt.verify(atoken, process.env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired, please log in again",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};
