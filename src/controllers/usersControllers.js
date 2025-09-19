import User from '../models/User.js';
import Trip from '../models/Trip.js';

export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('-password -aiChatHistory')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await User.countDocuments(query);
    
    res.status(200).json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error("Error calling getAllUsers", error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .select('-password')
      .populate('favoriteDestinations', 'name location category images')
      .populate('visitedDestinations.destination', 'name location category');
      
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error("Error calling getUserById", error);
    res.status(500).json({ message: "Error fetching user" });
  }
};

export const createUser = async (req, res) => {
  try {
    const userData = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }
    
    const user = new User(userData);
    const newUser = await user.save();
    
    // Remove password from response
    const userResponse = newUser.toObject();
    delete userResponse.password;
    
    res.status(201).json(userResponse);
    
  } catch (error) {
    console.error("Error calling createUser", error);
    res.status(500).json({ message: "Error creating user" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Don't allow password update through this endpoint
    delete updateData.password;
    
    const user = await User.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error("Error calling updateUser", error);
    res.status(500).json({ message: "Error updating user" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Also delete user's trips
    await Trip.deleteMany({ userId: id });
    
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error calling deleteUser", error);
    res.status(500).json({ message: "Error deleting user" });
  }
};

export const updateUserPreferences = async (req, res) => {
  try {
    const { id } = req.params;
    const { travelPreferences } = req.body;
    
    const user = await User.findByIdAndUpdate(
      id,
      { travelPreferences },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error("Error updating user preferences", error);
    res.status(500).json({ message: "Error updating user preferences" });
  }
};

export const addFavoriteDestination = async (req, res) => {
  try {
    const { id } = req.params;
    const { destinationId } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (!user.favoriteDestinations.includes(destinationId)) {
      user.favoriteDestinations.push(destinationId);
      await user.save();
    }
    
    const updatedUser = await User.findById(id)
      .select('-password')
      .populate('favoriteDestinations', 'name location category images');
      
    res.status(200).json(updatedUser);
    
  } catch (error) {
    console.error("Error adding favorite destination", error);
    res.status(500).json({ message: "Error adding favorite destination" });
  }
};

export const removeFavoriteDestination = async (req, res) => {
  try {
    const { id, destinationId } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    user.favoriteDestinations = user.favoriteDestinations.filter(
      dest => dest.toString() !== destinationId
    );
    await user.save();
    
    const updatedUser = await User.findById(id)
      .select('-password')
      .populate('favoriteDestinations', 'name location category images');
      
    res.status(200).json(updatedUser);
    
  } catch (error) {
    console.error("Error removing favorite destination", error);
    res.status(500).json({ message: "Error removing favorite destination" });
  }
};

export const getUserTrips = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { userId: id };
    if (status) query.status = status;
    
    const trips = await Trip.find(query)
      .populate('destinations', 'name location category images')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    const total = await Trip.countDocuments(query);
    
    res.status(200).json({
      trips,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error("Error fetching user trips", error);
    res.status(500).json({ message: "Error fetching user trips" });
  }
};
