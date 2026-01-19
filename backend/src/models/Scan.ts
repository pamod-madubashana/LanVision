import mongoose, { Document, Schema } from 'mongoose';

export interface IScan extends Document {
  userId: mongoose.Types.ObjectId;
  name?: string;
  target: string;
  profile: 'quick' | 'full';
  startedAt: Date;
  finishedAt?: Date;
  durationMs?: number;
  summary: {
    totalHosts: number;
    hostsUp: number;
    totalOpenPorts: number;
  };
  results: IHostResult[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface IHostResult {
  ip: string;
  hostname?: string;
  status: 'up' | 'down';
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  riskReasons: string[];
  ports: IPort[];
  osGuess?: string;
  lastSeenAt: Date;
}

export interface IPort {
  port: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'closed' | 'filtered';
  service?: string;
  version?: string;
}

const PortSchema = new Schema<IPort>({
  port: { type: Number, required: true },
  protocol: { 
    type: String, 
    enum: ['tcp', 'udp'], 
    required: true 
  },
  state: { 
    type: String, 
    enum: ['open', 'closed', 'filtered'], 
    required: true 
  },
  service: { type: String },
  version: { type: String }
});

const HostResultSchema = new Schema<IHostResult>({
  ip: { type: String, required: true },
  hostname: { type: String },
  status: { 
    type: String, 
    enum: ['up', 'down'], 
    required: true 
  },
  riskLevel: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    required: true 
  },
  riskScore: { type: Number, required: true, min: 0, max: 100 },
  riskReasons: [{ type: String }],
  ports: [PortSchema],
  osGuess: { type: String },
  lastSeenAt: { type: Date, default: Date.now }
});

const ScanSchema = new Schema<IScan>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { type: String },
  target: { type: String, required: true },
  profile: { 
    type: String, 
    enum: ['quick', 'full'], 
    required: true 
  },
  startedAt: { type: Date, required: true },
  finishedAt: { type: Date },
  durationMs: { type: Number },
  summary: {
    totalHosts: { type: Number, required: true, default: 0 },
    hostsUp: { type: Number, required: true, default: 0 },
    totalOpenPorts: { type: Number, required: true, default: 0 }
  },
  results: [HostResultSchema],
  status: { 
    type: String, 
    enum: ['pending', 'running', 'completed', 'failed'], 
    default: 'pending' 
  }
}, {
  timestamps: true
});

// Indexes for better query performance
ScanSchema.index({ userId: 1, createdAt: -1 });
ScanSchema.index({ target: 1 });
ScanSchema.index({ status: 1 });

const Scan = mongoose.model<IScan>('Scan', ScanSchema);
export default Scan;