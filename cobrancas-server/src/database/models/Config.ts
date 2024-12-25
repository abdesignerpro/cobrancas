import { Model, DataTypes } from 'sequelize';
import sequelize from '../index';

class Config extends Model {
  public key!: string;
  public value!: string;
  public readonly updatedAt!: Date;
}

Config.init(
  {
    key: {
      type: DataTypes.STRING(50),
      primaryKey: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Config',
    tableName: 'configs',
  }
);

export default Config;
