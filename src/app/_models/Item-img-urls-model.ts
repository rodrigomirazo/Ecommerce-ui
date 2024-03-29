
export class ItemImgUrls {

    private _id: number;
    private _itemId: number;
    private _createdTime: number;
    private _imgUrl: string;
    private _imgServer: string;

	constructor() {
    }
    
    /**
     * Getter id
     * @return {number}
     */
	public get id(): number {
		return this._id;
	}

    /**
     * Getter itemId
     * @return {number}
     */
	public get itemId(): number {
		return this._itemId;
	}

    /**
     * Getter createdTime
     * @return {number}
     */
	public get createdTime(): number {
		return this._createdTime;
	}

    /**
     * Getter imgUrl
     * @return {string}
     */
	public get imgUrl(): string {
		return this._imgUrl;
	}

    /**
     * Getter imgServer
     * @return {string}
     */
	public get imgServer(): string {
		return this._imgServer;
	}

    /**
     * Setter id
     * @param {number} value
     */
	public set id(value: number) {
		this._id = value;
	}

    /**
     * Setter itemId
     * @param {number} value
     */
	public set itemId(value: number) {
		this._itemId = value;
	}

    /**
     * Setter createdTime
     * @param {number} value
     */
	public set createdTime(value: number) {
		this._createdTime = value;
	}

    /**
     * Setter imgUrl
     * @param {string} value
     */
	public set imgUrl(value: string) {
		this._imgUrl = value;
	}

    /**
     * Setter imgServer
     * @param {string} value
     */
	public set imgServer(value: string) {
		this._imgServer = value;
	}

}