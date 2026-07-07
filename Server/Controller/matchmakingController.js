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


    // Create queue entry
    const queueEntry = await MatchmakingQueue.create({
      userId,
      preferredPlayerCount,
      status: "queued",

      timeoutAt: new Date(
        Date.now() + 5 * 60 * 1000
      )
    });


    return res.status(200).json({
      success: true,
      message: "Joined matchmaking queue",
      queueId: queueEntry._id,
      status: queueEntry.status
    });

  } catch (error) {

    console.error("Join Queue Error:", error);

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

    const { queueId } = req.body;


    const deletedQueue = await MatchmakingQueue.findOneAndDelete({
      _id: queueId,
      userId
    });


    if (!deletedQueue) {
      return res.status(404).json({
        success: false,
        message: "Queue entry not found"
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

    const { queueId } = req.query;


    const queueEntry = await MatchmakingQueue.findById(queueId);

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: "Queue not found"
      });
    }


    // Queue position calculation
    const playersAhead = await MatchmakingQueue.countDocuments({
      status: "queued",
      preferredPlayerCount: queueEntry.preferredPlayerCount,
      joinedAt: { $lt: queueEntry.joinedAt }
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
        playersAhead + 1
    });

  } catch (error) {

    console.error("Get Queue Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get queue status"
    });
  }
};