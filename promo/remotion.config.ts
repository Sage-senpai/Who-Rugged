import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Modest concurrency — heavy gradients + blur can exhaust Chrome memory.
Config.setConcurrency(3);
