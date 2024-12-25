import { Model, DataTypes } from 'sequelize';
import sequelize from '../index';

class Charge extends Model {
  public id!: string;
  public name!: string;
  public whatsapp!: string;
  public service!: string;
  public value!: number;
  public billingDay!: number;
  public recurrence!: string;
  public lastBillingDate?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Charge.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    whatsapp: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    service: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    billingDay: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 31
      }
    },
    recurrence: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['monthly', '3_months', '6_months']]
      }
    },
    lastBillingDate: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  },
  {
    sequelize,
    modelName: 'Charge',
    tableName: 'charges',
  }
);

export default Charge;
