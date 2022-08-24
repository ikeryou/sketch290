import { Body } from "matter-js";
import { Func } from '../core/func';
import { Canvas } from '../webgl/canvas';
import { Object3D } from 'three/src/core/Object3D';
import { Update } from '../libs/update';
import { MatterjsMgr } from './matterjsMgr';
import { Mesh } from 'three/src/objects/Mesh';
import { Vector3 } from 'three/src/math/Vector3';
import { ConeGeometry } from 'three/src/geometries/ConeGeometry';
import { MeshLambertMaterial } from 'three/src/materials/MeshLambertMaterial';
import { Scroller } from "../core/scroller";
import { Tween } from "../core/tween";
import { Point } from "../libs/point";
import { Conf } from "../core/conf";
import { PointLight } from "three";
import { Util } from "../libs/util";

export class Visual extends Canvas {

  private _con:Object3D;
  private _matterjs:MatterjsMgr;

  private _item:Array<Object3D> = [];
  private _txt:Array<{el:HTMLElement, pos:Point}> = [];
  private _coverItem:Array<HTMLElement> = [];

  constructor(opt: any) {
    super(opt);

    this._matterjs = opt.matterjs;

    this._con = new Object3D();
    this.mainScene.add(this._con);

    const light = new PointLight(0xffffff, 1);
    this.mainScene.add(light)
    light.position.x = Func.instance.sw() * 0;
    light.position.y = Func.instance.sh() * 0;
    light.position.z = Func.instance.sh() * 1;

    // 障害物
    const geo = new ConeGeometry(0.5, 5, 32, 1)
    this._matterjs.lineBodies[0].forEach(() => {
      const c = new Object3D();
      this._con.add(c);

      const mesh = new Mesh(
        geo,
        new MeshLambertMaterial({
          color: 0xffffff,
          emissive:0x333333,
          transparent:true,
          depthTest:false,
        })
      )
      c.add(mesh);
      mesh.position.set(0, -0.5, -0.5);
      mesh.rotation.x = Util.instance.radian(-90)
      this._item.push(c);
    })

    // テキスト作る
    const sw = Func.instance.sw();
    let y = Func.instance.sh() * 1.5;
    for(let i = 0; i < Conf.instance.TEXT_NUM; i++) {
      const t = document.createElement('div');
      t.innerHTML = i % 2 == 0 ? 'SCROLLSCROLLSCROLL' : '';
      t.classList.add('item');
      document.querySelector('.l-text')?.append(t);

      const x = i % 2 == 0 ? sw * 0.25 : sw * 0.75;
      this._txt.push({
        el:t,
        pos:new Point(x, y)
      });

      if(i % 2 != 0) y += Func.instance.sh() * 1.25;
    }

    Tween.instance.set(document.querySelector('.l-height'), {
      height:y + Func.instance.sh() * 0.5
    })

    // 後半のカバー
    const coverEl = document.querySelector('.l-cover') as HTMLElement;
    for(let i = 0; i < this._item.length; i++) {
      const coverItem = document.createElement('div');
      coverEl.append(coverItem);
      this._coverItem.push(coverItem);
    }


    Scroller.instance.set(0);
    this._resize()
  }


  protected _update(): void {
    super._update()

    // this._con.position.y = Func.instance.screenOffsetY() * -1;

    const sw = Func.instance.sw()
    const sh = Func.instance.sh()

    const scroll = Scroller.instance.val.y;

    this._txt.forEach((val,i) => {
      const txtSize = this.getRect(val.el);
      let txtX = val.pos.x;
      let txtY = val.pos.y - scroll;

      const itemBody = this._matterjs.itemBodies[i];

      Tween.instance.set(val.el, {
        x:sw * 0.5 - txtSize.width * 0.5,
        y:txtY - txtSize.height * 0.5,
        fontSize: itemBody.size * 1.2,
      })

      if(itemBody != undefined) Body.setPosition(itemBody.body, {x:txtX, y:txtY})
    })

    const b = this._matterjs.lineBodies[0];
    const bridgeSize = (sw / b.length) * 0.5;
    b.forEach((val,i) => {
      let bodyX = val.position.x - sw * 0.5
      let bodyY = val.position.y * -1 + sh * 0.5

      const offsetX = bridgeSize;

      const mesh = this._item[i];
      const to = new Vector3((sw / b.length) * i - sw * 0.5 + bridgeSize + offsetX, 0, 0);

      const top = sw * 0.05;
      const from = new Vector3(bodyX + offsetX, bodyY, -top);

      mesh.position.copy(from)
      mesh.lookAt(to)
      // mesh.position.copy(to)



      const size = bridgeSize * 1;
      mesh.scale.set(size, size, to.distanceTo(from) * 1);

      // mesh.scale.z *= (i % 2 == 0) ? 0.25 : 1;

      const ci = this._coverItem[i];
      from.z = 0;
      Tween.instance.set(ci, {
        y: from.y * -1 + sh * 0.5 + sh * 0.1 * 0,
        scaleY:Util.instance.map(to.distanceTo(from), 0.01, 0, 0, sh * 0.5) * (to.y - from.y)
      })
    })

    if (this.isNowRenderFrame()) {
      this._render()
    }
  }


  private _render(): void {
    this.renderer.setClearColor(0x00000, 0)
    this.renderer.render(this.mainScene, this.camera)
  }


  public isNowRenderFrame(): boolean {
    return this.isRender && Update.instance.cnt % 1 == 0
  }


  _resize(isRender: boolean = true): void {
    super._resize();

    const w = Func.instance.sw();
    const h = Func.instance.sh();

    this.renderSize.width = w;
    this.renderSize.height = h;

    this.updateCamera(this.camera, w, h);

    let pixelRatio: number = window.devicePixelRatio || 1;

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(w, h);
    this.renderer.clear();

    if (isRender) {
      this._render();
    }


    this._coverItem.forEach((val,i) => {
      const interval = w / this._coverItem.length;
      Tween.instance.set(val, {
        x:interval * i + interval * 0.5,
        // y:h * 0.5 - h * 0.1 * 0.5,
        width:interval * 0.75,
        height:h * 0.2,
        background: 'linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)'
      })
    })
  }
}
