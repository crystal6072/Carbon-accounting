import type { TreeOption } from '@/types'

/**
 * 行政区划三级树（省 / 市 / 区县）。
 *
 * value 直接使用「省 / 市 / 区」完整路径：
 * - 唯一，避免不同市同名区县冲突；
 * - 选中末级即可直接落库到 regionName，展示时天然带层级；
 * - 大区脱敏（某华东地区企业）按路径首段（省）判断。
 *
 * 原型内置竹木产业主要产区 + 直辖市，真实项目应替换为行政区划字典接口。
 */

type RegionSeed = { province: string; cities: { city: string; districts: string[] }[] }

const REGION_SEEDS: RegionSeed[] = [
  {
    province: '福建省',
    cities: [
      { city: '南平市', districts: ['建瓯市', '邵武市', '武夷山市', '顺昌县', '政和县'] },
      { city: '三明市', districts: ['永安市', '沙县', '尤溪县', '将乐县'] },
      { city: '漳州市', districts: ['南靖县', '华安县', '平和县'] },
      { city: '福州市', districts: ['闽侯县', '闽清县', '永泰县'] },
    ],
  },
  {
    province: '浙江省',
    cities: [
      { city: '湖州市', districts: ['安吉县', '德清县', '长兴县'] },
      { city: '丽水市', districts: ['庆元县', '龙泉市', '遂昌县'] },
      { city: '杭州市', districts: ['临安区', '余杭区', '富阳区', '拱墅区'] },
      { city: '宁波市', districts: ['北仑区', '鄞州区'] },
      { city: '衢州市', districts: ['龙游县', '开化县'] },
    ],
  },
  {
    province: '江西省',
    cities: [
      { city: '宜春市', districts: ['奉新县', '铜鼓县', '宜丰县'] },
      { city: '吉安市', districts: ['遂川县', '安福县', '井冈山市'] },
      { city: '抚州市', districts: ['资溪县', '宜黄县'] },
      { city: '赣州市', districts: ['崇义县', '上犹县'] },
    ],
  },
  {
    province: '广东省',
    cities: [
      { city: '清远市', districts: ['英德市', '连州市', '阳山县'] },
      { city: '韶关市', districts: ['南雄市', '始兴县', '仁化县'] },
      { city: '肇庆市', districts: ['广宁县', '怀集县', '封开县'] },
      { city: '深圳市', districts: ['南山区', '福田区'] },
      { city: '广州市', districts: ['天河区', '白云区'] },
    ],
  },
  {
    province: '江苏省',
    cities: [
      { city: '无锡市', districts: ['宜兴市', '江阴市'] },
      { city: '常州市', districts: ['溧阳市', '金坛区'] },
      { city: '南京市', districts: ['江宁区', '溧水区'] },
    ],
  },
  {
    province: '安徽省',
    cities: [
      { city: '黄山市', districts: ['休宁县', '歙县', '黟县'] },
      { city: '宣城市', districts: ['广德市', '泾县', '宁国市'] },
      { city: '六安市', districts: ['霍山县', '金寨县'] },
    ],
  },
  {
    province: '湖南省',
    cities: [
      { city: '益阳市', districts: ['桃江县', '安化县'] },
      { city: '怀化市', districts: ['会同县', '靖州苗族侗族自治县', '通道侗族自治县'] },
      { city: '邵阳市', districts: ['绥宁县', '城步苗族自治县'] },
    ],
  },
  {
    province: '四川省',
    cities: [
      { city: '成都市', districts: ['武侯区', '高新区'] },
      { city: '绵阳市', districts: ['涪城区', '游仙区'] },
      { city: '宜宾市', districts: ['长宁县', '江安县', '兴文县'] },
      { city: '泸州市', districts: ['纳溪区', '合江县', '叙永县'] },
      { city: '乐山市', districts: ['沐川县', '峨边彝族自治县'] },
    ],
  },
  {
    province: '广西壮族自治区',
    cities: [
      { city: '柳州市', districts: ['融水苗族自治县', '三江侗族自治县'] },
      { city: '桂林市', districts: ['资源县', '龙胜各族自治县'] },
    ],
  },
  {
    province: '山东省',
    cities: [{ city: '临沂市', districts: ['兰山区', '沂南县', '费县'] }],
  },
  {
    province: '北京市',
    cities: [{ city: '北京市', districts: ['海淀区', '朝阳区', '大兴区'] }],
  },
  {
    province: '上海市',
    cities: [{ city: '上海市', districts: ['浦东新区', '青浦区', '奉贤区'] }],
  },
  {
    province: '重庆市',
    cities: [{ city: '重庆市', districts: ['渝北区', '万州区', '永川区'] }],
  },
  {
    province: '天津市',
    cities: [{ city: '天津市', districts: ['滨海新区', '西青区', '静海区'] }],
  },
]

function pathOf(...parts: string[]): string {
  return parts.join(' / ')
}

export const REGION_TREE: TreeOption[] = REGION_SEEDS.map((seed) => ({
  value: seed.province,
  label: seed.province,
  children: seed.cities.map((city) => ({
    value: pathOf(seed.province, city.city),
    label: city.city,
    children: city.districts.map((district) => ({
      value: pathOf(seed.province, city.city, district),
      label: district,
    })),
  })),
}))

/** 省 / 市 / 区路径的展示文案（分隔符统一为「 / 」） */
export function regionPathText(regionName: string): string {
  if (!regionName) return ''
  return regionName
    .split(/\s*\/\s*/)
    .filter(Boolean)
    .join(' / ')
}

/** 从路径取省份（大区判断用） */
export function provinceOf(regionName: string): string {
  return regionName.split(/\s*\/\s*/)[0] ?? ''
}
