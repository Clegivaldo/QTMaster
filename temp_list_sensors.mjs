#!/usr/bin/env node
import { prisma } from './dist/lib/prisma.js';

(async function(){
  try{
    const sensors = await prisma.sensor.findMany({ take: 10 });
    console.log(JSON.stringify(sensors.map(s=>({id:s.id, serialNumber:s.serialNumber})), null, 2));
  }catch(e){
    console.error('ERR', e?.message || e);
    process.exit(1);
  }finally{ await prisma.$disconnect(); }
})();
