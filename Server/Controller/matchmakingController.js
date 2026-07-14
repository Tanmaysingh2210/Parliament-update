import MatchmakingQueue from "../models/MatchmakingQueue.js";


// JOIN QUEUE
export const joinQueue = async (req, res) => {
  try {

    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const userId = req.session.user.id;

    const { preferredPlayerCount } = req.body;


    // Validate player count
    if (
      !preferredPlayerCount ||
      preferredPlayerCount < 2 ||
      preferredPlayerCount > 6
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid player count"
      });
    }


    // Clean up any stale entries for this user (e.g. from a previous session crash)
    await MatchmakingQueue.deleteMany({
      userId,
      status: { $in: ["cancelled", "expired"] }
    });


    // Check if already in queue
    const existingQueue = await MatchmakingQueue.findOne({
      userId,
      status: "queued"
    });

    if (existingQueue) {
      return res.status(400).json({
        success: false,
        message: "Already in queue"
      });
    }

    // Check if already matched but hasn't navigated yet
    const existingMatch = await MatchmakingQueue.findOne({
      userId,
      status: "matched"
    });

    if (existingMatch) {
      return res.status(200).json({
        success: true,
        message: "Already matched",
        queueId: existingMatch._id,
        status: existingMatch.status,
        matchedGameId: existingMatch.matchedGameId
      });
    }


    // Create queue entry with 5-minute timeout
    const queueEntry = await MatchmakingQueue.create({
      userId,
      preferredPlayerCount,
      status: "queued",

      timeoutAt: new Date(
        Date.now() + 5 * 60 * 1000
      )
    });


    // Calculate position in queue
    const playersAhead = await MatchmakingQueue.countDocuments({
      status: "queued",
      preferredPlayerCount,
      joinedAt: { $lt: queueEntry.joinedAt }
    });

    const totalInQueue = await MatchmakingQueue.countDocuments({
      status: "queued",
      preferredPlayerCount
    });


    return res.status(200).json({
      success: true,
      message: "Joined matchmaking queue",
      queueId: queueEntry._id,
      status: queueEntry.status,
      preferredPlayerCount,
      positionInQueue: playersAhead + 1,
      playersInQueue: totalInQueue,
      playersNeeded: preferredPlayerCount
    });

  } catch (error) {

    console.error("Join Queue Error:", error);

    // Handle duplicate key error (user already in queue — race condition)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Already in queue"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to join queue"
    });
  }
};




// CANCEL QUEUE
export const cancelQueue = async (req, res) => {
  try {

    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const userId = req.session.user.id;

    // Find and delete user's active queue entry (no need for queueId — userId is unique)
    const deletedQueue = await MatchmakingQueue.findOneAndDelete({
      userId,
      status: "queued"
    });


    if (!deletedQueue) {
      return res.status(404).json({
        success: false,
        message: "No active queue entry found"
      });
    }


    return res.status(200).json({
      success: true,
      message: "Queue cancelled"
    });

  } catch (error) {

    console.error("Cancel Queue Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel queue"
    });
  }
};




// GET QUEUE STATUS
export const getQueueStatus = async (req, res) => {
  try {

    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const userId = req.session.user.id;

    // Find user's most recent queue entry (queued or matched)
    const queueEntry = await MatchmakingQueue.findOne({
      userId,
      status: { $in: ["queued", "matched"] }
    }).sort({ joinedAt: -1 });

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: "No active queue entry"
      });
    }


    // Queue position calculation
    const playersAhead = await MatchmakingQueue.countDocuments({
      status: "queued",
      preferredPlayerCount: queueEntry.preferredPlayerCount,
      joinedAt: { $lt: queueEntry.joinedAt }
    });

    const totalInQueue = await MatchmakingQueue.countDocuments({
      status: "queued",
      preferredPlayerCount: queueEntry.preferredPlayerCount
    });


    return res.status(200).json({
      success: true,

      queueId: queueEntry._id,

      status: queueEntry.status,

      preferredPlayerCount:
        queueEntry.preferredPlayerCount,

      matchedGameId:
        queueEntry.matchedGameId,

      positionInQueue:
        playersAhead + 1,

      playersInQueue: totalInQueue,

      playersNeeded: queueEntry.preferredPlayerCount
    });

  } catch (error) {

    console.error("Get Queue Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get queue status"
    });
  }
};