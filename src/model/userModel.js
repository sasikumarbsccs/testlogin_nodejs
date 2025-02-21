import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; // For password hashing

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true, // Ensure unique usernames
    },
    password: {
      type: String,
      required: true,
    },
    active: {      
      type: Number,
      enum: [1, 2],
      default: 1,
    },
    attempt_login: {
      type: Number,
      default: 0,
    },
    locked_date: {
      type: Date,
    },
    onetimelink_token: { type: String }, 
    link_exprie: { type: Date },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware to hash password before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


export default mongoose.model('LoginUser', userSchema);



