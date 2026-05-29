import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Advertisement } from '../entities/advertisement.entity';
import { CreateAdvertisementDto } from '../dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from '../dto/update-advertisement.dto';

@Injectable()
export class AdvertisementsService {
  constructor(
    @InjectRepository(Advertisement)
    private readonly advertisementRepository: Repository<Advertisement>,
  ) {}

  async create(createDto: CreateAdvertisementDto): Promise<Advertisement> {
    const newAd = this.advertisementRepository.create(createDto);
    return await this.advertisementRepository.save(newAd);
  }

  // Para el panel de administración (trae todas)
  async findAll(): Promise<Advertisement[]> {
    return await this.advertisementRepository.find();
  }

  // Para tu frontend (Astro) - Solo trae las que están activas
  async findActive(): Promise<Advertisement[]> {
    return await this.advertisementRepository.find({ 
      where: { isActive: true } 
    });
  }

  async findOne(id: number): Promise<Advertisement> {
    const ad = await this.advertisementRepository.findOne({ where: { id } });
    if (!ad) {
      throw new NotFoundException(`La promoción con ID #${id} no existe`);
    }
    return ad;
  }

  async update(id: number, updateDto: UpdateAdvertisementDto): Promise<Advertisement> {
    const ad = await this.findOne(id);
    // Combina los datos nuevos con los existentes
    Object.assign(ad, updateDto);
    return await this.advertisementRepository.save(ad);
  }

  async remove(id: number): Promise<void> {
    const ad = await this.findOne(id);
    await this.advertisementRepository.remove(ad);
  }
}