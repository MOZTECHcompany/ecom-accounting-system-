import { Injectable, NotFoundException } from '@nestjs/common';
import { EntitiesRepository } from './entities.repository';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';

/**
 * 公司實體服務
 * 處理多公司實體的商業邏輯
 */
@Injectable()
export class EntitiesService {
  constructor(private readonly entitiesRepository: EntitiesRepository) {}

  /**
   * 查詢所有公司實體
   */
  async findAll(isActive?: boolean) {
    return this.entitiesRepository.findAll(isActive);
  }

  /**
   * 查詢單一公司實體
   */
  async findOne(id: string) {
    const entity = await this.entitiesRepository.findOne(id);
    if (!entity) {
      throw new NotFoundException(`Entity with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * 建立新公司實體
   */
  async create(createEntityDto: CreateEntityDto) {
    return this.entitiesRepository.create(createEntityDto);
  }

  /**
   * 更新公司實體
   */
  async update(id: string, updateEntityDto: UpdateEntityDto) {
    await this.findOne(id); // 確認存在
    return this.entitiesRepository.update(id, updateEntityDto);
  }

  /**
   * 刪除公司實體（軟刪除）
   */
  async remove(id: string) {
    await this.findOne(id); // 確認存在
    return this.entitiesRepository.remove(id);
  }

  /**
   * 根據代碼查詢實體
   */
  async findByCode(code: string) {
    return this.entitiesRepository.findByCode(code);
  }
}
