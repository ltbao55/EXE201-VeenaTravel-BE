import Plan from '../models/Plan.js';

// Get all plans
export const getAllPlans = async (req, res) => {
  try {
    const { isActive } = req.query;
    
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    const plans = await Plan.find(filter)
      .sort({ displayOrder: 1, createdAt: 1 });
    
    res.json({
      success: true,
      data: plans,
      count: plans.length
    });
  } catch (error) {
    console.error('Get all plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plans'
    });
  }
};

// Get plan by ID
export const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const plan = await Plan.findById(id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }
    
    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Get plan by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plan'
    });
  }
};

// Create new plan (Admin only)
export const createPlan = async (req, res) => {
  try {
    const {
      name,
      price,
      trip_limit,
      message_limit,
      description,
      features,
      type,
      duration,
      displayOrder
    } = req.body;

    // Validate required fields
    if (!name || price === undefined || trip_limit === undefined || message_limit === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, trip_limit, and message_limit are required'
      });
    }

    // Check if plan name already exists
    const existingPlan = await Plan.findOne({ name });
    if (existingPlan) {
      return res.status(400).json({
        success: false,
        message: 'Plan with this name already exists'
      });
    }

    const plan = new Plan({
      name,
      price,
      trip_limit,
      message_limit,
      description,
      features: features || [],
      type: type || 'free',
      duration: duration || 30,
      displayOrder: displayOrder || 0
    });

    await plan.save();

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: plan
    });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create plan'
    });
  }
};

// Update plan (Admin only)
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if plan exists
    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // If updating name, check for duplicates
    if (updateData.name && updateData.name !== plan.name) {
      const existingPlan = await Plan.findOne({ name: updateData.name });
      if (existingPlan) {
        return res.status(400).json({
          success: false,
          message: 'Plan with this name already exists'
        });
      }
    }

    // Update plan
    Object.assign(plan, updateData);
    await plan.save();

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: plan
    });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update plan'
    });
  }
};

// Delete plan (Admin only)
export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    await Plan.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete plan'
    });
  }
};

// Toggle plan status (Admin only)
export const togglePlanStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    res.json({
      success: true,
      message: `Plan ${plan.isActive ? 'activated' : 'deactivated'} successfully`,
      data: plan
    });
  } catch (error) {
    console.error('Toggle plan status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle plan status'
    });
  }
};
