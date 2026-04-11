const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const EarthHistory = require('../models/EarthHistory');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/earth_history';

const seedData = [
    {
        stageId: 0,
        name: 'Đĩa tiền hành tinh',
        nameEn: 'Protoplanetary Disk',
        icon: '🌫️',
        time: 4600,
        timeEnd: 4550,
        timeDisplay: '4.6 tỷ năm trước',
        timeDisplayEn: '4.6 billion years ago',
        eon: 'Hadean',
        era: null,
        period: null,
        atmosphere: {
            o2: 0,
            co2: 0,
            n2: 0,
            pressure: 0
        },
        climate: {
            globalTemp: null,
            tempAnomaly: null,
            seaLevel: null,
            iceCoverage: 0
        },
        astronomy: {
            dayLength: 6,
            moonDistance: null,
            solarLuminosity: 0.7
        },
        continental: {
            config: 'protoearth',
            oceanCoverage: 0,
            landArea: 0
        },
        life: {
            exists: false,
            complexity: 'none',
            dominantLifeforms: [],
            biodiversityIndex: 0
        },
        majorEvents: [
            {
                name: 'Hình thành Hệ Mặt Trời',
                nameEn: 'Solar System Formation',
                description: 'Đám mây phân tử khổng lồ sụp đổ dưới tác động của trọng lực, tạo thành đĩa tiền hành tinh quay quanh Mặt Trời non trẻ.',
                type: 'tectonic',
                magnitude: 10
            }
        ],
        visual: {
            earthColor: '#8B4513',
            earthEmissive: '#331100',
            emissiveIntensity: 0.3,
            atmosphereColor: null,
            atmosphereOpacity: 0,
            surfaceType: 'dust',
            textureUrl: '/textures/protoearth.jpg'
        },
        flags: {
            hasDebris: true,
            hasMoon: false,
            hasMeteorites: false
        },
        description: {
            vi: 'Hệ Mặt Trời hình thành từ đám mây bụi và khí khổng lồ cách đây 4.6 tỷ năm. Các hạt bụi va chạm và kết dính, dần tạo thành các tiểu hành tinh (planetesimals). Những thiên thể này tiếp tục va chạm và hợp nhất, cuối cùng tạo nên các hành tinh nguyên thủy, bao gồm Trái Đất.',
            en: 'The Solar System formed from a giant cloud of dust and gas 4.6 billion years ago. Dust particles collided and stuck together, gradually forming planetesimals. These bodies continued to collide and merge, eventually creating the proto-planets, including Earth.'
        },
        resources: {
            wikipediaUrl: 'https://en.wikipedia.org/wiki/Formation_and_evolution_of_the_Solar_System'
        },
        order: 0
    },
    {
        stageId: 1,
        name: 'Va chạm Theia',
        nameEn: 'Theia Impact',
        icon: '💥',
        time: 4500,
        timeEnd: 4450,
        timeDisplay: '4.5 tỷ năm trước',
        timeDisplayEn: '4.5 billion years ago',
        eon: 'Hadean',
        atmosphere: {
            o2: 0,
            co2: 0,
            n2: 0,
            pressure: 0
        },
        climate: {
            globalTemp: 2000,
            seaLevel: null
        },
        astronomy: {
            dayLength: 5,
            moonDistance: null,
            solarLuminosity: 0.7
        },
        continental: {
            config: 'protoearth',
            oceanCoverage: 0
        },
        life: {
            exists: false,
            complexity: 'none'
        },
        majorEvents: [
            {
                name: 'Va chạm Theia',
                nameEn: 'Giant Impact',
                description: 'Hành tinh Theia (cỡ Sao Hỏa) va chạm với Trái Đất nguyên thủy với tốc độ 4 km/s, giải phóng năng lượng tương đương 100 triệu tỷ quả bom nguyên tử.',
                type: 'impact',
                magnitude: 10
            }
        ],
        visual: {
            earthColor: '#FF4500',
            earthEmissive: '#FF2200',
            emissiveIntensity: 0.9,
            surfaceType: 'molten',
            textureUrl: '/textures/molten.jpg'
        },
        flags: {
            hasDebris: true,
            hasMoon: false,
            isCollision: true
        },
        description: {
            vi: 'Một hành tinh cỡ Sao Hỏa tên Theia va chạm với Trái Đất nguyên thủy với tốc độ khoảng 4 km/s. Năng lượng khổng lồ từ vụ va chạm đã làm tan chảy hoàn toàn cả hai thiên thể, tạo ra một đại dương magma toàn cầu. Vật chất bắn ra từ vụ va chạm sau đó kết tụ trong quỹ đạo để tạo thành Mặt Trăng.',
            en: 'A Mars-sized planet called Theia collided with the proto-Earth at about 4 km/s. The enormous energy from the impact completely melted both bodies, creating a global magma ocean. Debris ejected from the collision later coalesced in orbit to form the Moon.'
        },
        resources: {
            wikipediaUrl: 'https://en.wikipedia.org/wiki/Giant-impact_hypothesis'
        },
        order: 1
    },
    {
        stageId: 2,
        name: 'Hình thành Mặt Trăng',
        nameEn: 'Moon Formation',
        icon: '🌙',
        time: 4450,
        timeEnd: 4400,
        timeDisplay: '4.45 tỷ năm trước',
        timeDisplayEn: '4.45 billion years ago',
        eon: 'Hadean',
        atmosphere: {
            o2: 0,
            co2: 50000,
            pressure: 10
        },
        climate: {
            globalTemp: 1500,
            seaLevel: null
        },
        astronomy: {
            dayLength: 6,
            moonDistance: 25,
            solarLuminosity: 0.7
        },
        continental: {
            config: 'protoearth',
            oceanCoverage: 0
        },
        life: {
            exists: false,
            complexity: 'none'
        },
        majorEvents: [
            {
                name: 'Mặt Trăng kết tụ',
                nameEn: 'Lunar Accretion',
                description: 'Mảnh vỡ từ vụ va chạm Theia kết tụ trong quỹ đạo chỉ trong vài trăm năm, tạo thành Mặt Trăng ở khoảng cách chỉ 25,000 km.',
                type: 'tectonic',
                magnitude: 9
            }
        ],
        visual: {
            earthColor: '#FF6347',
            earthEmissive: '#CC3311',
            emissiveIntensity: 0.8,
            surfaceType: 'molten',
            textureUrl: '/textures/molten.jpg'
        },
        flags: {
            hasDebris: true,
            hasMoon: true
        },
        description: {
            vi: 'Mảnh vỡ từ vụ va chạm Theia kết tụ trong quỹ đạo Trái Đất chỉ trong vài trăm năm, tạo thành Mặt Trăng. Ban đầu Mặt Trăng chỉ cách Trái Đất khoảng 25,000 km (ngày nay là 384,400 km). Ở khoảng cách này, Mặt Trăng nhìn từ Trái Đất lớn gấp 15 lần hiện tại và gây ra thủy triều cực kỳ mạnh.',
            en: 'Debris from the Theia impact coalesced in Earth\'s orbit within just a few hundred years, forming the Moon. Initially, the Moon was only about 25,000 km from Earth (today it\'s 384,400 km). At this distance, the Moon appeared 15 times larger and caused extremely powerful tides.'
        },
        order: 2
    },
    {
        stageId: 3,
        name: 'Thời kỳ Hadean',
        nameEn: 'Hadean Eon',
        icon: '🔥',
        time: 4000,
        timeEnd: 3800,
        timeDisplay: '4 tỷ năm trước',
        timeDisplayEn: '4 billion years ago',
        eon: 'Hadean',
        atmosphere: {
            o2: 0,
            co2: 200000,
            n2: 10,
            ch4: 1000,
            pressure: 100
        },
        climate: {
            globalTemp: 230,
            tempAnomaly: 215,
            seaLevel: null,
            iceCoverage: 0
        },
        astronomy: {
            dayLength: 10,
            moonDistance: 100,
            solarLuminosity: 0.72
        },
        continental: {
            config: 'protoearth',
            oceanCoverage: 0
        },
        life: {
            exists: false,
            complexity: 'none',
            biodiversityIndex: 0
        },
        majorEvents: [
            {
                name: 'Đại dương magma',
                nameEn: 'Magma Ocean',
                description: 'Bề mặt Trái Đất phủ đầy đại dương magma nóng chảy, nhiệt độ bề mặt trên 1000°C.',
                type: 'volcanic',
                magnitude: 10
            },
            {
                name: 'Bắn phá thiên thạch',
                nameEn: 'Heavy Bombardment',
                description: 'Trái Đất liên tục bị thiên thạch và sao chổi bắn phá.',
                type: 'impact',
                magnitude: 8
            }
        ],
        visual: {
            earthColor: '#DC143C',
            earthEmissive: '#8B0000',
            emissiveIntensity: 0.7,
            atmosphereColor: '#330000',
            atmosphereOpacity: 0.4,
            surfaceType: 'hellish',
            textureUrl: '/textures/hadean.jpg'
        },
        flags: {
            hasMoon: true,
            hasMeteorites: true
        },
        description: {
            vi: 'Thời kỳ Hadean (tên từ Hades - địa ngục Hy Lạp) là giai đoạn "địa ngục" của Trái Đất. Bề mặt phủ đầy magma nóng chảy với nhiệt độ trên 1000°C. Khí quyển chủ yếu là CO₂ và hơi nước với áp suất cao gấp 100 lần hiện tại. Trái Đất liên tục bị thiên thạch bắn phá, mỗi vụ va chạm lớn có thể làm bay hơi toàn bộ đại dương (nếu có).',
            en: 'The Hadean Eon (named after Hades - Greek underworld) was Earth\'s "hellish" period. The surface was covered in molten magma with temperatures exceeding 1000°C. The atmosphere was mainly CO₂ and water vapor at 100 times present pressure. Earth was continuously bombarded by meteorites, with major impacts capable of vaporizing any oceans that might have formed.'
        },
        order: 3
    },
    {
        stageId: 4,
        name: 'Late Heavy Bombardment',
        nameEn: 'Late Heavy Bombardment',
        icon: '☄️',
        time: 3900,
        timeEnd: 3800,
        timeDisplay: '3.9 tỷ năm trước',
        timeDisplayEn: '3.9 billion years ago',
        eon: 'Hadean',
        atmosphere: {
            o2: 0,
            co2: 150000,
            n2: 20,
            pressure: 50
        },
        climate: {
            globalTemp: 150,
            seaLevel: null
        },
        astronomy: {
            dayLength: 12,
            moonDistance: 150,
            solarLuminosity: 0.73
        },
        continental: {
            config: 'protoearth',
            oceanCoverage: 10
        },
        life: {
            exists: false,
            complexity: 'none'
        },
        majorEvents: [
            {
                name: 'Bắn phá thiên thạch dữ dội',
                nameEn: 'Intense Bombardment',
                description: 'Giai đoạn bắn phá thiên thạch dữ dội nhất, hàng triệu thiên thể va chạm với Trái Đất và Mặt Trăng.',
                type: 'impact',
                magnitude: 10
            },
            {
                name: 'Nước đến Trái Đất',
                nameEn: 'Water Delivery',
                description: 'Sao chổi và tiểu hành tinh mang nước và chất hữu cơ đến Trái Đất.',
                type: 'impact',
                magnitude: 9
            }
        ],
        visual: {
            earthColor: '#A52A2A',
            earthEmissive: '#551111',
            emissiveIntensity: 0.5,
            atmosphereColor: '#220000',
            atmosphereOpacity: 0.3,
            surfaceType: 'cratered',
            textureUrl: '/textures/lhb.jpg'
        },
        flags: {
            hasMoon: true,
            hasMeteorites: true
        },
        description: {
            vi: 'Late Heavy Bombardment (LHB) là giai đoạn bắn phá thiên thạch dữ dội nhất trong lịch sử Hệ Mặt Trời. Hàng triệu tiểu hành tinh và sao chổi va chạm với các hành tinh đá, tạo ra các miệng núi lửa khổng lồ mà ta vẫn thấy trên Mặt Trăng ngày nay. Quan trọng là, các sao chổi đã mang một lượng lớn nước và các phân tử hữu cơ đến Trái Đất - có thể là nguồn gốc của sự sống.',
            en: 'The Late Heavy Bombardment (LHB) was the most intense period of meteorite impacts in Solar System history. Millions of asteroids and comets struck the rocky planets, creating the giant craters still visible on the Moon today. Importantly, comets delivered vast amounts of water and organic molecules to Earth - potentially the building blocks of life.'
        },
        order: 4
    },
    {
        stageId: 5,
        name: 'Đại dương đầu tiên',
        nameEn: 'First Oceans',
        icon: '🌊',
        time: 3800,
        timeEnd: 3500,
        timeDisplay: '3.8 tỷ năm trước',
        timeDisplayEn: '3.8 billion years ago',
        eon: 'Archean',
        era: 'Eoarchean',
        atmosphere: {
            o2: 0,
            co2: 100000,
            n2: 30,
            ch4: 500,
            pressure: 20
        },
        climate: {
            globalTemp: 70,
            tempAnomaly: 55,
            seaLevel: 0,
            oceanTemp: 60
        },
        astronomy: {
            dayLength: 13,
            moonDistance: 200,
            solarLuminosity: 0.75
        },
        continental: {
            config: 'scattered',
            oceanCoverage: 80,
            landArea: 50
        },
        life: {
            exists: false,
            complexity: 'none',
            biodiversityIndex: 0
        },
        majorEvents: [
            {
                name: 'Đại dương hình thành',
                nameEn: 'Ocean Formation',
                description: 'Hơi nước trong khí quyển ngưng tụ tạo thành đại dương đầu tiên khi Trái Đất nguội đi.',
                type: 'climate',
                magnitude: 10
            }
        ],
        visual: {
            earthColor: '#4682B4',
            earthEmissive: '#001133',
            emissiveIntensity: 0.3,
            atmosphereColor: '#334455',
            atmosphereOpacity: 0.3,
            surfaceType: 'ocean_early',
            textureUrl: '/textures/archean_ocean.jpg'
        },
        flags: {
            hasMoon: true
        },
        description: {
            vi: 'Khi Trái Đất nguội đi, hơi nước trong khí quyển dày đặc bắt đầu ngưng tụ, tạo ra trận mưa kéo dài hàng triệu năm. Nước từ sao chổi và từ bên trong Trái Đất (qua núi lửa) tích tụ tạo thành đại dương đầu tiên. Đại dương này nóng (khoảng 60°C), có tính axit và có màu xanh lục do chứa nhiều sắt hòa tan. Khí quyển chủ yếu là CO₂ và N₂, không có oxy tự do.',
            en: 'As Earth cooled, water vapor in the thick atmosphere began to condense, causing rainfall that lasted millions of years. Water from comets and Earth\'s interior (via volcanoes) accumulated to form the first oceans. These oceans were hot (about 60°C), acidic, and greenish due to dissolved iron. The atmosphere was mainly CO₂ and N₂, with no free oxygen.'
        },
        order: 5
    },
    {
        stageId: 6,
        name: 'Sự sống đầu tiên',
        nameEn: 'First Life',
        icon: '🦠',
        time: 3500,
        timeEnd: 2500,
        timeDisplay: '3.5 tỷ năm trước',
        timeDisplayEn: '3.5 billion years ago',
        eon: 'Archean',
        era: 'Paleoarchean',
        atmosphere: {
            o2: 0.001,
            co2: 80000,
            n2: 40,
            ch4: 1000,
            pressure: 15
        },
        climate: {
            globalTemp: 50,
            tempAnomaly: 35,
            oceanTemp: 50
        },
        astronomy: {
            dayLength: 14,
            moonDistance: 250,
            solarLuminosity: 0.77
        },
        continental: {
            config: 'scattered',
            oceanCoverage: 75
        },
        life: {
            exists: true,
            complexity: 'prokaryote',
            dominantLifeforms: [
                {
                    name: 'Vi khuẩn cổ (Archaea)',
                    nameEn: 'Archaea',
                    type: 'archaea',
                    description: 'Sinh vật đơn bào đầu tiên, sống ở môi trường khắc nghiệt',
                    firstAppearance: true,
                    dominant: true
                },
                {
                    name: 'Vi khuẩn (Bacteria)',
                    nameEn: 'Bacteria',
                    type: 'bacteria',
                    description: 'Sinh vật đơn bào đa dạng',
                    firstAppearance: true
                }
            ],
            biodiversityIndex: 5,
            oxygenProducers: false
        },
        majorEvents: [
            {
                name: 'Sự sống xuất hiện',
                nameEn: 'Origin of Life',
                description: 'Sinh vật đơn bào đầu tiên xuất hiện, có lẽ tại các miệng thủy nhiệt dưới đáy đại dương.',
                type: 'biological',
                magnitude: 10
            },
            {
                name: 'Stromatolite đầu tiên',
                nameEn: 'First Stromatolites',
                description: 'Cấu trúc đá do vi khuẩn tạo ra - bằng chứng hóa thạch cổ nhất của sự sống.',
                type: 'biological',
                magnitude: 8
            }
        ],
        visual: {
            earthColor: '#2E8B57',
            earthEmissive: '#003311',
            emissiveIntensity: 0.3,
            atmosphereColor: '#223344',
            atmosphereOpacity: 0.25,
            surfaceType: 'early_life',
            textureUrl: '/textures/archean_life.jpg'
        },
        flags: {
            hasMoon: true
        },
        description: {
            vi: 'Sự sống xuất hiện trên Trái Đất khoảng 3.5 tỷ năm trước (có thể sớm hơn đến 4 tỷ năm). Sinh vật đầu tiên là các vi khuẩn cổ (Archaea) và vi khuẩn (Bacteria) - những sinh vật đơn bào không có nhân. Chúng có thể đã xuất hiện tại các miệng thủy nhiệt dưới đáy đại dương, nơi có nguồn năng lượng và hóa chất dồi dào. Stromatolite - cấu trúc đá do vi khuẩn tạo ra - là bằng chứng hóa thạch cổ nhất của sự sống.',
            en: 'Life appeared on Earth about 3.5 billion years ago (possibly as early as 4 billion). The first organisms were Archaea and Bacteria - single-celled organisms without nuclei. They likely originated at hydrothermal vents on the ocean floor, where energy and chemicals were abundant. Stromatolites - rock structures built by bacteria - are the oldest fossil evidence of life.'
        },
        order: 6
    },
    {
        stageId: 7,
        name: 'Great Oxidation Event',
        nameEn: 'Great Oxidation Event',
        icon: '💨',
        time: 2400,
        timeEnd: 2000,
        timeDisplay: '2.4 tỷ năm trước',
        timeDisplayEn: '2.4 billion years ago',
        eon: 'Proterozoic',
        era: 'Paleoproterozoic',
        atmosphere: {
            o2: 2,
            co2: 10000,
            n2: 70,
            ch4: 10,
            pressure: 1.5
        },
        climate: {
            globalTemp: 10,
            tempAnomaly: -5,
            iceCoverage: 30
        },
        astronomy: {
            dayLength: 17,
            moonDistance: 300,
            solarLuminosity: 0.82
        },
        continental: {
            config: 'scattered',
            oceanCoverage: 70
        },
        life: {
            exists: true,
            complexity: 'prokaryote',
            dominantLifeforms: [
                {
                    name: 'Vi khuẩn lam (Cyanobacteria)',
                    nameEn: 'Cyanobacteria',
                    type: 'bacteria',
                    description: 'Vi khuẩn quang hợp đầu tiên, thay đổi khí quyển Trái Đất',
                    dominant: true
                }
            ],
            biodiversityIndex: 8,
            extinctionRate: 90,
            oxygenProducers: true
        },
        majorEvents: [
            {
                name: 'Sự kiện Oxy hóa Lớn',
                nameEn: 'Great Oxidation Event',
                description: 'Vi khuẩn lam quang hợp thải oxy, thay đổi hoàn toàn thành phần khí quyển.',
                type: 'biological',
                magnitude: 10
            },
            {
                name: 'Thảm họa Oxy',
                nameEn: 'Oxygen Catastrophe',
                description: 'Oxy - chất độc với hầu hết sinh vật lúc đó - gây ra đại tuyệt chủng đầu tiên.',
                type: 'extinction',
                magnitude: 9
            }
        ],
        visual: {
            earthColor: '#20B2AA',
            earthEmissive: '#005544',
            emissiveIntensity: 0.3,
            atmosphereColor: '#88CCFF',
            atmosphereOpacity: 0.25,
            surfaceType: 'oxidation',
            textureUrl: '/textures/goe.jpg'
        },
        flags: {
            hasMoon: true,
            isExtinction: true
        },
        description: {
            vi: 'Great Oxidation Event (GOE) là sự kiện thay đổi khí quyển lớn nhất lịch sử Trái Đất. Vi khuẩn lam (Cyanobacteria) tiến hành quang hợp, thải ra oxy như sản phẩm phụ. Oxy tích tụ trong khí quyển từ 0% lên 2% - một sự thay đổi khổng lồ. Nhưng với hầu hết sinh vật lúc đó, oxy là chất độc! Kết quả là đại tuyệt chủng đầu tiên - "Thảm họa Oxy" - giết chết đến 90% sinh vật.',
            en: 'The Great Oxidation Event (GOE) was the largest atmospheric change in Earth\'s history. Cyanobacteria performed photosynthesis, releasing oxygen as a byproduct. Oxygen accumulated in the atmosphere from 0% to 2% - a massive change. But for most life at the time, oxygen was toxic! The result was the first mass extinction - the "Oxygen Catastrophe" - killing up to 90% of life.'
        },
        order: 7
    },
    {
        stageId: 8,
        name: 'Trái Đất Tuyết',
        nameEn: 'Snowball Earth',
        icon: '❄️',
        time: 700,
        timeEnd: 635,
        timeDisplay: '700 triệu năm trước',
        timeDisplayEn: '700 million years ago',
        eon: 'Proterozoic',
        era: 'Neoproterozoic',
        period: 'Cryogenian',
        atmosphere: {
            o2: 5,
            co2: 350,
            n2: 78,
            pressure: 0.9
        },
        climate: {
            globalTemp: -50,
            tempAnomaly: -65,
            seaLevel: -500,
            iceCoverage: 100,
            oceanTemp: -2
        },
        astronomy: {
            dayLength: 20,
            moonDistance: 350,
            solarLuminosity: 0.94
        },
        continental: {
            config: 'rodinia',
            oceanCoverage: 30
        },
        life: {
            exists: true,
            complexity: 'eukaryote',
            dominantLifeforms: [
                {
                    name: 'Sinh vật nhân thực',
                    nameEn: 'Eukaryotes',
                    type: 'protist',
                    description: 'Sinh vật có nhân, sống sót ở các suối nước nóng',
                    dominant: true
                }
            ],
            biodiversityIndex: 10
        },
        majorEvents: [
            {
                name: 'Trái Đất đóng băng hoàn toàn',
                nameEn: 'Global Glaciation',
                description: 'Băng bao phủ từ cực đến xích đạo, Trái Đất trở thành "quả cầu tuyết".',
                type: 'climate',
                magnitude: 10
            }
        ],
        visual: {
            earthColor: '#F0FFFF',
            earthEmissive: '#ADD8E6',
            emissiveIntensity: 0.4,
            atmosphereColor: '#CCEEFF',
            atmosphereOpacity: 0.35,
            surfaceType: 'snowball',
            textureUrl: '/textures/snowball.jpg'
        },
        flags: {
            hasMoon: true
        },
        description: {
            vi: 'Trái Đất Tuyết (Snowball Earth) là giai đoạn đóng băng toàn cầu kéo dài hàng chục triệu năm. Băng bao phủ từ cực đến xích đạo, biến Trái Đất thành một quả cầu tuyết trắng. Nhiệt độ trung bình khoảng -50°C. Sự sống chỉ tồn tại ở các miệng núi lửa ngầm và suối nước nóng dưới lớp băng dày hàng km. Giai đoạn này kết thúc khi núi lửa giải phóng đủ CO₂ để gây hiệu ứng nhà kính.',
            en: 'Snowball Earth was a period of global glaciation lasting tens of millions of years. Ice covered from poles to equator, turning Earth into a white snowball. Average temperature was about -50°C. Life survived only at underwater volcanic vents and hot springs beneath kilometers of ice. This period ended when volcanoes released enough CO₂ to cause a greenhouse effect.'
        },
        order: 8
    },
    {
        stageId: 9,
        name: 'Bùng nổ Cambrian',
        nameEn: 'Cambrian Explosion',
        icon: '🐚',
        time: 540,
        timeEnd: 485,
        timeDisplay: '540 triệu năm trước',
        timeDisplayEn: '540 million years ago',
        eon: 'Phanerozoic',
        era: 'Paleozoic',
        period: 'Cambrian',
        atmosphere: {
            o2: 12,
            co2: 4500,
            n2: 78,
            pressure: 1
        },
        climate: {
            globalTemp: 21,
            tempAnomaly: 6,
            seaLevel: 50,
            iceCoverage: 0
        },
        astronomy: {
            dayLength: 21,
            moonDistance: 365,
            solarLuminosity: 0.96
        },
        continental: {
            config: 'scattered',
            oceanCoverage: 85,
            landArea: 150
        },
        life: {
            exists: true,
            complexity: 'complex',
            dominantLifeforms: [
                {
                    name: 'Trilobite',
                    nameEn: 'Trilobite',
                    type: 'invertebrate',
                    description: 'Động vật chân khớp phổ biến nhất, có mắt phức hợp',
                    firstAppearance: true,
                    dominant: true
                },
                {
                    name: 'Anomalocaris',
                    nameEn: 'Anomalocaris',
                    type: 'invertebrate',
                    description: 'Kẻ săn mồi đỉnh cao, dài đến 1m',
                    firstAppearance: true
                }
            ],
            biodiversityIndex: 40,
            landLife: false
        },
        majorEvents: [
            {
                name: 'Bùng nổ Cambrian',
                nameEn: 'Cambrian Explosion',
                description: 'Hầu hết các ngành động vật xuất hiện trong khoảng 20-25 triệu năm - "Big Bang của sinh học".',
                type: 'evolution',
                magnitude: 10
            }
        ],
        visual: {
            earthColor: '#3CB371',
            earthEmissive: '#006622',
            emissiveIntensity: 0.2,
            atmosphereColor: '#87CEEB',
            atmosphereOpacity: 0.2,
            surfaceType: 'cambrian',
            textureUrl: '/textures/cambrian.jpg'
        },
        flags: {
            hasMoon: true
        },
        description: {
            vi: 'Bùng nổ Cambrian là sự kiện tiến hóa quan trọng nhất lịch sử sự sống. Trong khoảng 20-25 triệu năm (rất ngắn theo thời gian địa chất), hầu hết các ngành động vật đã xuất hiện. Đây là lần đầu tiên động vật có vỏ cứng, mắt, và các cơ quan phức tạp. Trilobite thống trị đại dương với mắt phức hợp tinh vi. Anomalocaris là kẻ săn mồi đỉnh cao, dài đến 1m. Đây thực sự là "Big Bang của sinh học".',
            en: 'The Cambrian Explosion was the most important evolutionary event in the history of life. Within 20-25 million years (very short in geological time), most animal phyla appeared. This was the first time animals had hard shells, eyes, and complex organs. Trilobites dominated the oceans with sophisticated compound eyes. Anomalocaris was the apex predator, up to 1m long. This was truly the "Big Bang of biology".'
        },
        order: 9
    },
    {
        stageId: 10,
        name: 'Đại tuyệt chủng Permian',
        nameEn: 'Permian Extinction',
        icon: '💀',
        time: 252,
        timeEnd: 251,
        timeDisplay: '252 triệu năm trước',
        timeDisplayEn: '252 million years ago',
        eon: 'Phanerozoic',
        era: 'Paleozoic',
        period: 'Permian',
        atmosphere: {
            o2: 16,
            co2: 900,
            n2: 78,
            pressure: 1
        },
        climate: {
            globalTemp: 23,
            tempAnomaly: 8,
            seaLevel: -60
        },
        astronomy: {
            dayLength: 22.8,
            moonDistance: 378,
            solarLuminosity: 0.98
        },
        continental: {
            config: 'pangaea',
            oceanCoverage: 60
        },
        life: {
            exists: true,
            complexity: 'complex',
            dominantLifeforms: [
                {
                    name: 'Synapsid (Tổ tiên thú)',
                    nameEn: 'Synapsids',
                    type: 'reptile',
                    description: 'Bò sát giống thú, tổ tiên của động vật có vú',
                    dominant: true
                }
            ],
            biodiversityIndex: 20,
            extinctionRate: 96,
            landLife: true
        },
        majorEvents: [
            {
                name: 'The Great Dying',
                nameEn: 'The Great Dying',
                description: '96% sinh vật biển và 70% sinh vật cạn tuyệt chủng - tuyệt chủng lớn nhất lịch sử.',
                type: 'extinction',
                magnitude: 10
            },
            {
                name: 'Núi lửa Siberia',
                nameEn: 'Siberian Traps',
                description: 'Siêu núi lửa Siberia phun trào liên tục 2 triệu năm, thải CO₂ và SO₂ khổng lồ.',
                type: 'volcanic',
                magnitude: 10
            }
        ],
        visual: {
            earthColor: '#8B0000',
            earthEmissive: '#550000',
            emissiveIntensity: 0.5,
            atmosphereColor: '#664422',
            atmosphereOpacity: 0.4,
            surfaceType: 'extinction',
            textureUrl: '/textures/permian.jpg'
        },
        flags: {
            hasMoon: true,
            isExtinction: true
        },
        description: {
            vi: '"The Great Dying" - Đại tuyệt chủng Permian là thảm họa lớn nhất lịch sử sự sống trên Trái Đất. 96% sinh vật biển và 70% sinh vật cạn đã biến mất vĩnh viễn. Nguyên nhân chính là siêu núi lửa Siberian Traps phun trào liên tục 2 triệu năm, thải ra lượng CO₂ và SO₂ khổng lồ. Điều này gây ra biến đổi khí hậu cực đoan, axit hóa đại dương, và mất oxy. Sự sống mất 10 triệu năm để phục hồi.',
            en: '"The Great Dying" - the Permian extinction was the largest catastrophe in the history of life on Earth. 96% of marine species and 70% of land species disappeared forever. The main cause was the Siberian Traps supervolcano erupting continuously for 2 million years, releasing massive amounts of CO₂ and SO₂. This caused extreme climate change, ocean acidification, and oxygen loss. Life took 10 million years to recover.'
        },
        order: 10
    },
    {
        stageId: 11,
        name: 'Kỷ Jurassic',
        nameEn: 'Jurassic Period',
        icon: '🦕',
        time: 150,
        timeEnd: 145,
        timeDisplay: '150 triệu năm trước',
        timeDisplayEn: '150 million years ago',
        eon: 'Phanerozoic',
        era: 'Mesozoic',
        period: 'Jurassic',
        atmosphere: {
            o2: 26,
            co2: 1950,
            n2: 72,
            pressure: 1
        },
        climate: {
            globalTemp: 22,
            tempAnomaly: 7,
            seaLevel: 100,
            iceCoverage: 0
        },
        astronomy: {
            dayLength: 23.2,
            moonDistance: 380,
            solarLuminosity: 0.99
        },
        continental: {
            config: 'laurasia_gondwana',
            oceanCoverage: 70
        },
        life: {
            exists: true,
            complexity: 'complex',
            dominantLifeforms: [
                {
                    name: 'Brachiosaurus',
                    nameEn: 'Brachiosaurus',
                    type: 'dinosaur',
                    description: 'Khủng long cổ dài cao 13m, nặng 56 tấn',
                    dominant: true
                },
                {
                    name: 'Allosaurus',
                    nameEn: 'Allosaurus',
                    type: 'dinosaur',
                    description: 'Kẻ săn mồi đỉnh cao, dài 12m',
                    dominant: true
                },
                {
                    name: 'Archaeopteryx',
                    nameEn: 'Archaeopteryx',
                    type: 'bird',
                    description: 'Chim đầu tiên, cầu nối giữa khủng long và chim hiện đại',
                    firstAppearance: true
                }
            ],
            biodiversityIndex: 70,
            landLife: true,
            aerialLife: true
        },
        majorEvents: [
            {
                name: 'Thời đại hoàng kim của khủng long',
                nameEn: 'Golden Age of Dinosaurs',
                description: 'Khủng long thống trị mọi hệ sinh thái trên cạn. Khủng long sauropod đạt kích thước khổng lồ.',
                type: 'evolution',
                magnitude: 8
            },
            {
                name: 'Chim đầu tiên',
                nameEn: 'First Birds',
                description: 'Archaeopteryx xuất hiện - cầu nối tiến hóa giữa khủng long và chim.',
                type: 'evolution',
                magnitude: 9
            }
        ],
        visual: {
            earthColor: '#228B22',
            earthEmissive: '#004400',
            emissiveIntensity: 0.2,
            atmosphereColor: '#87CEEB',
            atmosphereOpacity: 0.2,
            surfaceType: 'jurassic',
            textureUrl: '/textures/jurassic.jpg'
        },
        flags: {
            hasMoon: true
        },
        description: {
            vi: 'Kỷ Jurassic là thời đại hoàng kim của khủng long. Các khủng long sauropod như Brachiosaurus cao 13m và nặng 56 tấn, Diplodocus dài 27m thống trị các cánh rừng nhiệt đới. Allosaurus là kẻ săn mồi đỉnh cao. Đặc biệt, Archaeopteryx xuất hiện - sinh vật chuyển tiếp giữa khủng long và chim, có lông vũ nhưng vẫn có răng và đuôi dài. Pangaea tiếp tục tách, tạo Laurasia (bắc) và Gondwana (nam).',
            en: 'The Jurassic was the golden age of dinosaurs. Sauropods like the 13m tall, 56-ton Brachiosaurus and 27m long Diplodocus dominated tropical forests. Allosaurus was the apex predator. Notably, Archaeopteryx appeared - the transitional creature between dinosaurs and birds, with feathers but still teeth and a long tail. Pangaea continued splitting into Laurasia (north) and Gondwana (south).'
        },
        order: 11
    },
    {
        stageId: 12,
        name: 'Thiên thạch Chicxulub',
        nameEn: 'Chicxulub Impact',
        icon: '☄️',
        time: 66,
        timeEnd: 65.9,
        timeDisplay: '66 triệu năm trước',
        timeDisplayEn: '66 million years ago',
        eon: 'Phanerozoic',
        era: 'Cenozoic',
        period: 'Paleogene',
        atmosphere: {
            o2: 23,
            co2: 500,
            n2: 77,
            pressure: 1
        },
        climate: {
            globalTemp: 8,
            tempAnomaly: -7,
            iceCoverage: 20
        },
        astronomy: {
            dayLength: 23.5,
            moonDistance: 382,
            solarLuminosity: 1
        },
        continental: {
            config: 'laurasia_gondwana',
            oceanCoverage: 68
        },
        life: {
            exists: true,
            complexity: 'complex',
            dominantLifeforms: [
                {
                    name: 'Tyrannosaurus Rex',
                    nameEn: 'Tyrannosaurus Rex',
                    type: 'dinosaur',
                    description: 'Kẻ săn mồi cuối cùng và mạnh nhất của khủng long'
                }
            ],
            biodiversityIndex: 30,
            extinctionRate: 75,
            landLife: true
        },
        majorEvents: [
            {
                name: 'Va chạm thiên thạch Chicxulub',
                nameEn: 'Chicxulub Impact',
                description: 'Thiên thạch đường kính 10km đâm vào bán đảo Yucatan với tốc độ 20 km/s.',
                type: 'impact',
                magnitude: 10
            },
            {
                name: 'Đại tuyệt chủng K-Pg',
                nameEn: 'K-Pg Extinction',
                description: '75% loài sinh vật tuyệt chủng, kết thúc kỷ nguyên 165 triệu năm của khủng long.',
                type: 'extinction',
                magnitude: 10
            }
        ],
        visual: {
            earthColor: '#556B2F',
            earthEmissive: '#333300',
            emissiveIntensity: 0.4,
            atmosphereColor: '#444444',
            atmosphereOpacity: 0.5,
            surfaceType: 'asteroid_impact',
            textureUrl: '/textures/kpg.jpg'
        },
        flags: {
            hasMoon: true,
            hasDebris: true,
            isAsteroidImpact: true,
            isExtinction: true
        },
        description: {
            vi: 'Cách đây 66 triệu năm, một thiên thạch đường kính 10km đâm vào bán đảo Yucatan (Mexico) với tốc độ 20 km/s. Vụ va chạm giải phóng năng lượng tương đương 10 tỷ quả bom nguyên tử, tạo ra miệng hố rộng 180km. Sóng thần cao 300m quét qua Đại Tây Dương. Bụi che phủ bầu trời trong 10 năm, gây "mùa đông hạt nhân". 75% sinh vật tuyệt chủng, bao gồm toàn bộ khủng long không phải chim. Đây là dấu chấm hết cho 165 triệu năm thống trị của khủng long.',
            en: '66 million years ago, a 10km asteroid struck the Yucatan Peninsula (Mexico) at 20 km/s. The impact released energy equivalent to 10 billion atomic bombs, creating a 180km crater. 300m tsunamis swept across the Atlantic. Dust blocked sunlight for 10 years, causing a "nuclear winter". 75% of species went extinct, including all non-avian dinosaurs. This ended 165 million years of dinosaur dominance.'
        },
        order: 12
    },
    {
        stageId: 13,
        name: 'Kỷ băng hà cuối cùng',
        nameEn: 'Last Ice Age',
        icon: '🧊',
        time: 0.02,
        timeEnd: 0.01,
        timeDisplay: '20,000 năm trước',
        timeDisplayEn: '20,000 years ago',
        eon: 'Phanerozoic',
        era: 'Cenozoic',
        period: 'Quaternary',
        epoch: 'Pleistocene',
        atmosphere: {
            o2: 21,
            co2: 180,
            n2: 78,
            pressure: 1
        },
        climate: {
            globalTemp: 10,
            tempAnomaly: -5,
            seaLevel: -120,
            iceCoverage: 30
        },
        astronomy: {
            dayLength: 24,
            moonDistance: 384.3,
            solarLuminosity: 1
        },
        continental: {
            config: 'modern',
            oceanCoverage: 65
        },
        life: {
            exists: true,
            complexity: 'intelligent',
            dominantLifeforms: [
                {
                    name: 'Voi ma mút',
                    nameEn: 'Woolly Mammoth',
                    type: 'mammal',
                    description: 'Voi khổng lồ phủ lông, thích nghi với khí hậu lạnh',
                    dominant: true
                },
                {
                    name: 'Homo sapiens',
                    nameEn: 'Homo sapiens',
                    type: 'human',
                    description: 'Loài người hiện đại, đang mở rộng khắp thế giới',
                    dominant: true
                }
            ],
            biodiversityIndex: 85,
            landLife: true
        },
        majorEvents: [
            {
                name: 'Đỉnh điểm băng hà',
                nameEn: 'Last Glacial Maximum',
                description: 'Băng bao phủ 30% bề mặt Trái Đất, mực nước biển thấp hơn 120m.',
                type: 'climate',
                magnitude: 8
            },
            {
                name: 'Di cư sang châu Mỹ',
                nameEn: 'Americas Migration',
                description: 'Con người di cư từ châu Á sang châu Mỹ qua cầu đất Bering.',
                type: 'biological',
                magnitude: 7
            }
        ],
        visual: {
            earthColor: '#B0E0E6',
            earthEmissive: '#446688',
            emissiveIntensity: 0.3,
            atmosphereColor: '#ADD8E6',
            atmosphereOpacity: 0.25,
            surfaceType: 'ice_age',
            textureUrl: '/textures/ice_age.jpg'
        },
        flags: {
            hasMoon: true
        },
        description: {
            vi: 'Đỉnh điểm kỷ băng hà cuối cùng cách đây 20,000 năm. Băng bao phủ 30% bề mặt Trái Đất, với các tảng băng dày 3km phủ kín Canada và Bắc Âu. Mực nước biển thấp hơn 120m so với ngày nay, tạo ra cầu đất Bering nối châu Á với châu Mỹ. Voi ma mút, tê giác lông xù, hổ răng kiếm sinh sống ở các đồng cỏ rộng lớn. Homo sapiens đã mở rộng khắp thế giới và bắt đầu tạo ra nghệ thuật hang động.',
            en: 'The Last Glacial Maximum was 20,000 years ago. Ice covered 30% of Earth\'s surface, with 3km thick ice sheets over Canada and Northern Europe. Sea level was 120m lower than today, creating the Bering land bridge connecting Asia to the Americas. Woolly mammoths, woolly rhinos, and saber-toothed cats roamed vast grasslands. Homo sapiens had spread worldwide and began creating cave art.'
        },
        order: 13
    },
    {
        stageId: 14,
        name: 'Trái Đất hiện đại',
        nameEn: 'Modern Earth',
        icon: '🌍',
        /** Cửa sổ Ma khớp Quaternary → hiện tại (tránh time=timeEnd=0 không overlap PBDB) */
        time: 2.58,
        timeEnd: 0,
        timeDisplay: 'Hiện tại',
        timeDisplayEn: 'Present Day',
        eon: 'Phanerozoic',
        era: 'Cenozoic',
        period: 'Quaternary',
        epoch: 'Holocene',
        atmosphere: {
            o2: 21,
            co2: 420,
            n2: 78,
            ch4: 1.9,
            pressure: 1
        },
        climate: {
            globalTemp: 15,
            tempAnomaly: 0,
            seaLevel: 0,
            iceCoverage: 10,
            oceanTemp: 17
        },
        astronomy: {
            dayLength: 24,
            yearLength: 365.25,
            moonDistance: 384.4,
            solarLuminosity: 1
        },
        continental: {
            config: 'modern',
            oceanCoverage: 71,
            landArea: 149
        },
        life: {
            exists: true,
            complexity: 'intelligent',
            dominantLifeforms: [
                {
                    name: 'Homo sapiens',
                    nameEn: 'Homo sapiens',
                    type: 'human',
                    description: '8 tỷ người, loài thống trị hành tinh',
                    dominant: true
                }
            ],
            biodiversityIndex: 80,
            extinctionRate: 0.1,
            landLife: true,
            aerialLife: true
        },
        majorEvents: [
            {
                name: 'Kỷ Anthropocene',
                nameEn: 'Anthropocene Epoch',
                description: 'Con người trở thành lực lượng địa chất chính, thay đổi khí hậu và hệ sinh thái toàn cầu.',
                type: 'biological',
                magnitude: 9
            },
            {
                name: 'Đại tuyệt chủng thứ 6',
                nameEn: 'Sixth Mass Extinction',
                description: 'Tốc độ tuyệt chủng hiện tại cao gấp 100-1000 lần bình thường do hoạt động con người.',
                type: 'extinction',
                magnitude: 7
            }
        ],
        visual: {
            earthColor: '#6B93D6',
            earthEmissive: '#112244',
            emissiveIntensity: 0.2,
            atmosphereColor: '#87CEEB',
            atmosphereOpacity: 0.2,
            surfaceType: 'modern',
            textureUrl: '/textures/earth_modern.jpg',
            normalMapUrl: '/textures/earth_normal.jpg',
            cloudsTextureUrl: '/textures/earth_clouds.png',
            nightTextureUrl: '/textures/earth_night.jpg'
        },
        flags: {
            hasMoon: true
        },
        description: {
            vi: 'Trái Đất ngày nay là nhà của 8 tỷ người - loài thống trị hành tinh. Chúng ta đang sống trong kỷ Anthropocene, kỷ nguyên mà con người đã trở thành lực lượng địa chất chính. CO₂ khí quyển đạt 420 ppm - cao nhất trong 4 triệu năm, gây biến đổi khí hậu toàn cầu. Tốc độ tuyệt chủng hiện tại cao gấp 100-1000 lần bình thường. Đây có thể là khởi đầu của đại tuyệt chủng thứ 6 trong lịch sử Trái Đất.',
            en: 'Modern Earth is home to 8 billion people - the dominant species on the planet. We live in the Anthropocene, an era where humans have become the primary geological force. Atmospheric CO₂ has reached 420 ppm - the highest in 4 million years, causing global climate change. The current extinction rate is 100-1000 times normal. This may be the beginning of the sixth mass extinction in Earth\'s history.'
        },
        resources: {
            wikipediaUrl: 'https://en.wikipedia.org/wiki/Anthropocene'
        },
        order: 14
    }
];

async function seedDatabase() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
        
        // Clear existing data
        await EarthHistory.deleteMany({});
        console.log('Cleared existing data');
        
        // Insert seed data
        const result = await EarthHistory.insertMany(seedData);
        console.log(`Inserted ${result.length} stages`);
        
        // Verify
        const count = await EarthHistory.countDocuments();
        console.log(`Total documents in collection: ${count}`);
        
        console.log('\n✅ Database seeded successfully!');
        
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Disconnected from MongoDB');
    }
}

seedDatabase();
